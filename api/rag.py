from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import chromadb
import os
import traceback
import re
from numpy import dot
from numpy.linalg import norm
import json
from datetime import datetime
from sqlalchemy import select

from database import AsyncSessionLocal
from models import Inventory
from google import genai as google_genai

from rouge_score import rouge_scorer
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction

# ---------------- CONFIG ----------------

router = APIRouter()

_client = google_genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

chroma_client = chromadb.PersistentClient(path="./chroma_db")

collection = chroma_client.get_or_create_collection(
    name="pdf_chunks",
    metadata={"hnsw:space": "cosine"}
)

# ---------------- SCHEMA ----------------

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5
    use_only_last_document: bool = False

# ---------------- EMBEDDING HELPER ----------------

def get_embedding(text: str) -> list[float]:
    result = _client.models.embed_content(
        model="gemini-embedding-001",
        contents=text
    )
    return result.embeddings[0].values

# ---------------- HELPER: Get Last Document ----------------

def get_last_uploaded_document():
    try:
        all_docs = collection.get(include=["metadatas"])
        if not all_docs or not all_docs.get("metadatas"):
            return None
        metadatas = all_docs["metadatas"]
        latest_doc = None
        latest_timestamp = None
        for meta in metadatas:
            timestamp = meta.get("upload_timestamp")
            if timestamp:
                if latest_timestamp is None or timestamp > latest_timestamp:
                    latest_timestamp = timestamp
                    latest_doc = meta.get("source")
        if not latest_doc and metadatas:
            latest_doc = metadatas[-1].get("source")
        print(f"[DEBUG] Last uploaded document: {latest_doc}")
        return latest_doc
    except Exception as e:
        print(f"[ERROR] Failed to get last document: {e}")
        return None

# ---------------- INVENTORY → TEXT ----------------

async def inventory_to_text_chunks():
    print("[DEBUG] Loading inventory data from DB...")
    chunks = []
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Inventory).where(Inventory.is_active == True)
        )
        items = result.scalars().all()
        print(f"[DEBUG] Loaded {len(items)} inventory items from DB.")
        for item in items:
            status = (
                "Low Stock"
                if item.quantity_in_stock < item.reorder_threshold
                else "Normal"
            )
            text = (
                f"Product {item.product_id} ({item.product_name}) "
                f"has {item.quantity_in_stock} units in stock. "
                f"Reorder threshold is {item.reorder_threshold}. "
                f"Inventory status is {status}."
            )
            if item.supplier_info:
                text += f" Supplier information: {item.supplier_info}."
            chunks.append(text)
    print(f"[DEBUG] Created {len(chunks)} inventory text chunks.")
    return chunks

# ---------------- Normalization helper ----------------

def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s]', '', text)
    return text.strip()

# ---------------- ROUGE + BLEU ----------------

def evaluate_answer(generated: str, reference: str):
    generated_norm = normalize_text(generated)
    reference_norm = normalize_text(reference)
    scorer = rouge_scorer.RougeScorer(
        ["rouge1", "rouge2", "rougeL"],
        use_stemmer=True
    )
    rouge_scores = scorer.score(reference_norm, generated_norm)
    smoothie = SmoothingFunction().method4
    bleu = sentence_bleu(
        [reference_norm.split()],
        generated_norm.split(),
        smoothing_function=smoothie
    )
    return {
        "rouge1": round(rouge_scores["rouge1"].fmeasure * 100, 2),
        "rouge2": round(rouge_scores["rouge2"].fmeasure * 100, 2),
        "rougeL": round(rouge_scores["rougeL"].fmeasure * 100, 2),
        "bleu": round(bleu * 100, 2)
    }

# ---------------- Faithfulness ----------------

def evaluate_faithfulness(answer: str, context: str):
    prompt = f"""
You are evaluating whether an AI-generated answer is faithful to the provided context.

Context:
{context}

Answer:
{answer}

Carefully check whether every claim in the answer is directly supported by the context.
A claim is faithful if it can be verified from the context without making assumptions.

Respond ONLY in valid JSON format with no additional text:
{{
  "faithful": true or false,
  "hallucinated_claims": ["list any claims not supported by context"],
  "faithfulness_score": a number between 0 and 1 (0 = completely unfaithful, 1 = completely faithful)
}}
"""
    try:
        response = _client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt
        )
        result_text = response.text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result = json.loads(result_text.strip())
        return {
            "faithful": result.get("faithful", False),
            "hallucinated_claims": result.get("hallucinated_claims", []),
            "faithfulness_percentage": round(result.get("faithfulness_score", 0) * 100, 2)
        }
    except Exception as e:
        print(f"[ERROR] Faithfulness evaluation failed: {e}")
        return {
            "faithful": None,
            "hallucinated_claims": [],
            "faithfulness_percentage": None
        }

# ---------------- Helper: Multiple reference chunks ----------------

def get_top_matching_chunks(query_emb, documents, doc_embeddings, top_n=3):
    similarities = []
    for doc, emb in zip(documents, doc_embeddings):
        sim = dot(query_emb, emb) / (norm(query_emb) * norm(emb))
        similarities.append((sim, doc))
    similarities.sort(reverse=True, key=lambda x: x[0])
    top_chunks = [doc for _, doc in similarities[:top_n]]
    return " ".join(top_chunks)

# ---------------- Inventory detection ----------------

def is_inventory_question(question: str) -> bool:
    inventory_keywords = ["inventory", "stock level", "reorder", "quantity in stock", "units in stock"]
    policy_keywords = ["penalty", "sla", "policy", "procedure", "contract", "rate", "compliance", "standard"]
    question_lower = question.lower()
    if any(kw in question_lower for kw in policy_keywords):
        return False
    return any(kw in question_lower for kw in inventory_keywords)

# ---------------- API ----------------

@router.post("/")
async def rag_query(payload: QueryRequest):
    try:
        print(f"[DEBUG] Received question: {payload.question}")
        question = payload.question.strip()
        if not question:
            raise HTTPException(status_code=400, detail="Question is empty")

        query_embedding = get_embedding(question)

        query_top_k = max(payload.top_k, 10)
        where_filter = None
        if payload.use_only_last_document:
            last_doc = get_last_uploaded_document()
            if last_doc:
                where_filter = {"source": last_doc}
                print(f"[DEBUG] Filtering results to only: {last_doc}")
            else:
                print("[WARNING] No last document found, using all documents")

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=query_top_k,
            where=where_filter,
            include=["documents", "metadatas"]
        )

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        inventory_chunks = []
        if not payload.use_only_last_document:
            inventory_chunks = await inventory_to_text_chunks()

        if not documents and not inventory_chunks:
            return {
                "answer": "No relevant information found in the specified document.",
                "sources": [],
                "evaluation": None,
                "filtered_to_last_document": payload.use_only_last_document
            }

        context_chunks = documents + inventory_chunks
        context = "\n\n".join(context_chunks)

        prompt = f"""
You are a supply chain intelligence assistant. Answer the question below using ONLY the provided context.

Instructions:
- Be precise and comprehensive
- Include specific details from the context (numbers, names, dates)
- Structure your answer clearly
- If the answer is not in the context, state that clearly

Context:
{context}

Question:
{question}

Answer:
"""

        response = _client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt
        )
        answer = response.text.strip()

        doc_embeddings = [get_embedding(doc) for doc in documents]
        if documents:
            reference_answer = get_top_matching_chunks(
                get_embedding(question),
                documents,
                doc_embeddings,
                top_n=3
            )
        else:
            reference_answer = " ".join(context_chunks[:3])

        rouge_bleu_scores = evaluate_answer(answer, reference_answer)
        faithfulness = evaluate_faithfulness(answer, context)

        sources = [
            {
                "text": doc,
                "source": meta.get("source", ""),
                "page": meta.get("page", "")
            }
            for doc, meta in zip(documents, metadatas)
        ]

        is_inventory = is_inventory_question(question)

        return {
            "question": question,
            "answer": answer,
            "evaluation": (
                {
                    **rouge_bleu_scores,
                    "faithfulness": faithfulness
                }
                if not is_inventory else None
            ),
            "sources": sources if not is_inventory else [],
            "show_evaluation_and_sources": not is_inventory,
            "filtered_to_last_document": payload.use_only_last_document,
            "document_used": get_last_uploaded_document() if payload.use_only_last_document else "all"
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
