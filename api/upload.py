from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
import tempfile
import os
from typing import List

from sentence_transformers import SentenceTransformer

router = APIRouter()

# Load sentence transformer ONCE (important for performance)
embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Minimal addition: in-memory store for uploaded files metadata
uploaded_files_metadata = []

@router.post("/")
async def upload_pdf(files: List[UploadFile] = File(...)):
    total_chunks_added = 0
    print(f"[DEBUG] Number of files received: {len(files)}")

    for idx, file in enumerate(files):
        filename = file.filename
        print(f"[DEBUG] Processing file {idx + 1}/{len(files)}: {filename}")

        # 1. Save PDF to temp file
        try:
            contents = await file.read()
            print(f"[DEBUG] Size of file '{filename}': {len(contents)} bytes")
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                tmp_file.write(contents)
                tmp_pdf_path = tmp_file.name
                print(f"[DEBUG] Saved temporary file at: {tmp_pdf_path}")
        except Exception as e:
            print(f"[ERROR] Error saving temp PDF for {filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Error saving temp PDF: {e}")

        # 2. Extract text page-wise
        try:
            reader = PdfReader(tmp_pdf_path)
            print(f"[DEBUG] Number of pages in {filename}: {len(reader.pages)}")
        except Exception as e:
            print(f"[ERROR] Error reading PDF {filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Error reading PDF: {e}")
        finally:
            if os.path.exists(tmp_pdf_path):
                os.remove(tmp_pdf_path)
                print(f"[DEBUG] Removed temporary file: {tmp_pdf_path}")

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

        all_chunks = []
        all_metadatas = []
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if not text.strip():
                print(f"[DEBUG] Page {page_num + 1} in {filename} is empty or no text extracted")
                continue
            chunks = splitter.split_text(text)
            all_chunks.extend(chunks)
            print(f"[DEBUG] Page {page_num + 1} in {filename}: {len(chunks)} chunks")
            # Add metadata for each chunk
            for _ in chunks:
                all_metadatas.append({
                    "source": filename,
                    "page": page_num + 1
                })

        if not all_chunks:
            print(f"[ERROR] No text found in PDF {filename}")
            raise HTTPException(status_code=400, detail=f"No text found in PDF {filename}")

        # 4. Generate embeddings locally
        try:
            embeddings = embedding_model.encode(all_chunks, show_progress_bar=False).tolist()
            print(f"[DEBUG] Generated embeddings for {len(all_chunks)} chunks")
        except Exception as e:
            print(f"[ERROR] Embedding error for {filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Embedding error: {e}")

        # 5. Initialize Chroma
        try:
            client = chromadb.Client()
            collection = client.get_or_create_collection(
                name="pdf_chunks", metadata={"hnsw:space": "cosine"}
            )
            print(f"[DEBUG] Chroma collection initialized or retrieved")
        except Exception as e:
            print(f"[ERROR] Vector DB init error: {e}")
            raise HTTPException(status_code=500, detail=f"Vector DB init error: {e}")

        # 6. Store embeddings with metadata
        try:
            ids = [f"chunk_{i}" for i in range(len(all_chunks))]
            collection.add(
                documents=all_chunks,
                embeddings=embeddings,
                ids=ids,
                metadatas=all_metadatas
            )
            print(f"[DEBUG] Stored {len(all_chunks)} chunks in vector DB for {filename}")
        except Exception as e:
            print(f"[ERROR] Vector insert error for {filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Vector insert error: {e}")

        total_chunks_added += len(all_chunks)

        # Minimal addition: store file metadata for GET
        uploaded_files_metadata.append({
            "name": filename,
            "status": "Indexed",
            "size": f"{len(contents) // 1024} KB"
        })

    print(f"[DEBUG] Total chunks added for all files: {total_chunks_added}")
    return JSONResponse({
        "status": "success",
        "chunks_added": total_chunks_added
    })

# Minimal addition: GET handler to list uploaded files metadata
@router.get("/")
async def list_uploaded_files():
    return {"files": uploaded_files_metadata}
