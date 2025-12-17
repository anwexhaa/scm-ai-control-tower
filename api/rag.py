from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import chromadb
import os
import traceback
import re
from numpy import dot
from numpy.linalg import norm
import json

from .inventory import load_inventory
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

# 🔹 Evaluation imports
from rouge_score import rouge_scorer
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction

# ---------------- CONFIG ----------------

router = APIRouter()

embedding_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

gemini_model = genai.GenerativeModel(
    model_name="gemini-2.5-flash"
)

chroma_client = chromadb.Client()

collection = chroma_client.get_or_create_collection(
    name="pdf_chunks"
)

# ---------------- SCHEMA ----------------

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5

# ---------------- INVENTORY → TEXT ----------------

def inventory_to_text_chunks():
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
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s]', '', text)
    return text.strip()

# ---------------- IMPROVED ROUGE + BLEU ----------------

def evaluate_answer(generated: str, reference: str):
    """
    Evaluates answer quality using multiple ROUGE metrics and BLEU.
    Returns scores as percentages for better readability.
    """
    generated_norm = normalize_text(generated)
    reference_norm = normalize_text(reference)

    # Use multiple ROUGE metrics for comprehensive evaluation
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
        "rouge1": round(rouge_scores["rouge1"].fmeasure * 100, 2),  # Convert to %
        "rouge2": round(rouge_scores["rouge2"].fmeasure * 100, 2),  # Convert to %
        "rougeL": round(rouge_scores["rougeL"].fmeasure * 100, 2),  # Convert to %
        "bleu": round(bleu * 100, 2)  # Convert to %
    }

# ---------------- IMPROVED Faithfulness ----------------

def evaluate_faithfulness(answer: str, context: str):
    """
    Evaluates whether the answer is faithful to the context.
    Returns faithfulness as a percentage.
    """
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
        response = gemini_model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        
        result = json.loads(result_text.strip())
        
        # Convert to percentage and ensure proper format
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

# ---------------- IMPROVED: Multiple reference chunks ----------------

def get_top_matching_chunks(query_emb, documents, doc_embeddings, top_n=3):
    """
    Get top N most relevant chunks for building a comprehensive reference.
    This improves ROUGE scores by including more relevant context.
    """
    similarities = []
    for doc, emb in zip(documents, doc_embeddings):
        sim = dot(query_emb, emb) / (norm(query_emb) * norm(emb))
        similarities.append((sim, doc))
    
    # Sort by similarity and take top N
    similarities.sort(reverse=True, key=lambda x: x[0])
    top_chunks = [doc for _, doc in similarities[:top_n]]
    
    return " ".join(top_chunks)

# ---------------- Inventory detection ----------------

def is_inventory_question(question: str) -> bool:
    keywords = ["inventory", "stock", "product", "reorder", "supplier", "quantity"]
    question_lower = question.lower()
    return any(kw in question_lower for kw in keywords)

# ---------------- IMPROVED API ----------------

@router.post("/")
async def rag_query(payload: QueryRequest):
    try:
        print(f"[DEBUG] Received question: {payload.question}")
        question = payload.question.strip()
        if not question:
            raise HTTPException(status_code=400, detail="Question is empty")

        # 1️⃣ Embed query
        query_embedding = embedding_model.encode(question).tolist()

        # 2️⃣ Chroma search - retrieve more for better context
        query_top_k = max(payload.top_k, 10)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=query_top_k,
            include=["documents", "metadatas"]
        )

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        # 3️⃣ Inventory augmentation
        inventory_chunks = inventory_to_text_chunks()

        if not documents and not inventory_chunks:
            return {
                "answer": "No relevant information found in the knowledge base.",
                "sources": [],
                "evaluation": None
            }

        # 4️⃣ Build comprehensive context
        context_chunks = documents + inventory_chunks
        context = "\n\n".join(context_chunks)

        # 🔥 IMPROVED PROMPT for better answer quality
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

        # 5️⃣ Generate answer
        response = gemini_model.generate_content(prompt)
        answer = response.text.strip()

        # 6️⃣ IMPROVED evaluation reference
        doc_embeddings = [embedding_model.encode(doc) for doc in documents]

        if documents:
            # Use multiple top chunks for better reference
            reference_answer = get_top_matching_chunks(
                embedding_model.encode(question), 
                documents, 
                doc_embeddings,
                top_n=3  # Use top 3 chunks for richer reference
            )
        else:
            reference_answer = " ".join(context_chunks[:3])

        # Calculate ROUGE and BLEU scores
        rouge_bleu_scores = evaluate_answer(answer, reference_answer)

        # 🔥 Faithfulness evaluation
        faithfulness = evaluate_faithfulness(answer, context)

        # 7️⃣ Sources
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
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )