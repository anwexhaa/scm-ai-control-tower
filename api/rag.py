from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import chromadb
import os
import traceback  # Added for detailed error logs
import re
from numpy import dot
from numpy.linalg import norm

from .inventory import load_inventory  # ✅ Inventory integration
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

# 🔹 Evaluation imports
from rouge_score import rouge_scorer
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction

# ---------------- CONFIG ----------------

router = APIRouter()

# Load embedding model
embedding_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

# Gemini setup
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

gemini_model = genai.GenerativeModel(
    model_name="gemini-2.5-flash"
)

# Chroma client
chroma_client = chromadb.Client()

collection = chroma_client.get_or_create_collection(
    name="pdf_chunks"
)

# ---------------- SCHEMA ----------------

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5

# ---------------- INVENTORY → TEXT (NEW) ----------------

def inventory_to_text_chunks():
    """
    Converts structured inventory CSV into natural-language facts
    usable by the LLM inside RAG context.
    """
    print("[DEBUG] Loading inventory data...")
    items = load_inventory()
    print(f"[DEBUG] Loaded {len(items)} inventory items.")
    chunks = []

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
    text = re.sub(r'\s+', ' ', text)  # collapse whitespace
    text = re.sub(r'[^\w\s]', '', text)  # remove punctuation
    return text.strip()

# ---------------- Evaluation helper ----------------

def evaluate_answer(generated: str, reference: str):
    generated = normalize_text(generated)
    reference = normalize_text(reference)

    scorer = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
    rouge_l = scorer.score(reference, generated)["rougeL"].fmeasure

    smoothie = SmoothingFunction().method4
    bleu = sentence_bleu(
        [reference.split()],
        generated.split(),
        smoothing_function=smoothie
    )

    return {
        "rougeL": round(rouge_l, 3),
        "bleu": round(bleu, 3)
    }

# ---------------- Helper: find best matching chunk ----------------

def get_best_matching_chunk(query_emb, documents, doc_embeddings):
    max_sim = -1
    best_chunk = ""
    for doc, emb in zip(documents, doc_embeddings):
        sim = dot(query_emb, emb) / (norm(query_emb) * norm(emb))
        if sim > max_sim:
            max_sim = sim
            best_chunk = doc
    return best_chunk

# ---------------- New helper to detect inventory questions ----------------

def is_inventory_question(question: str) -> bool:
    keywords = ["inventory", "stock", "product", "reorder", "supplier", "quantity"]
    question_lower = question.lower()
    return any(kw in question_lower for kw in keywords)

# ---------------- API ----------------

@router.post("/")
async def rag_query(payload: QueryRequest):
    try:
        print(f"[DEBUG] Received question: {payload.question}")
        question = payload.question.strip()
        if not question:
            raise HTTPException(status_code=400, detail="Question is empty")

        # 1️⃣ Embed user query
        print("[DEBUG] Generating query embedding...")
        query_embedding = embedding_model.encode(question).tolist()
        print(f"[DEBUG] Query embedding length: {len(query_embedding)}")

        # 2️⃣ Similarity search in Chroma — increase n_results for better recall
        query_top_k = max(payload.top_k, 10)
        print(f"[DEBUG] Querying Chroma for top {query_top_k} results...")
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=query_top_k,
            include=["documents", "metadatas"]
        )

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        print(f"[DEBUG] Retrieved {len(documents)} documents from Chroma.")

        # 3️⃣ Inventory augmentation (NEW)
        inventory_chunks = inventory_to_text_chunks()

        if not documents and not inventory_chunks:
            return {
                "answer": "No relevant information found in the knowledge base.",
                "sources": [],
                "evaluation": None
            }

        # 4️⃣ Build unified context
        context_chunks = documents + inventory_chunks
        context = "\n\n".join(context_chunks)
        print(f"[DEBUG] Built context with {len(context_chunks)} chunks.")

        prompt = f"""
You are a supply chain intelligence assistant.

Answer the user's question ONLY using the context below.
If the answer is not present, say you do not have enough information.

Context:
{context}

Question:
{question}

Answer:
"""

        # 5️⃣ Generate answer
        print("[DEBUG] Generating answer using Gemini model...")
        response = gemini_model.generate_content(prompt)
        answer = response.text
        print(f"[DEBUG] Generated answer length: {len(answer)}")

        # Embed documents for similarity
        doc_embeddings = [embedding_model.encode(doc) for doc in documents]

        # Get best matching chunk for evaluation
        if documents:
            reference_answer = get_best_matching_chunk(query_embedding, documents, doc_embeddings)
        else:
            reference_answer = context_chunks[0]

        print("[DEBUG] Evaluating generated answer...")
        evaluation_scores = evaluate_answer(answer, reference_answer)

        # 7️⃣ Sources (PDF only — inventory is implicit)
        sources = [
            {
                "text": doc,
                "source": meta.get("source", ""),
                "page": meta.get("page", "")
            }
            for doc, meta in zip(documents, metadatas)
        ]

        is_inventory = is_inventory_question(question)

        print("[DEBUG] Returning response to client.")
        return {
            "question": question,
            "answer": answer,
            "evaluation": evaluation_scores if not is_inventory else None,
            "sources": sources if not is_inventory else [],
            "show_evaluation_and_sources": not is_inventory,
        }
    except Exception as e:
        print("[ERROR] Exception occurred in /rag/ endpoint:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
