from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

load_dotenv()

from database import init_db
from api import upload, rag, inventory, agent
from api import csv_upload

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("✅ Database tables initialized")
    yield

app = FastAPI(
    title="Supply Chain Agentic AI Control Tower",
    description="Enterprise-grade multi-agent system for SCM intelligence",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PDF RAG upload:  POST /upload/pdf
# CSV preview:     POST /upload/preview
# CSV commit:      POST /upload/commit
# CSV file list:   GET  /upload/files
# CSV conflicts:   GET  /upload/conflicts
app.include_router(upload.router,     prefix="/upload",    tags=["Document Ingestion (PDF)"])
app.include_router(csv_upload.router, prefix="/upload",    tags=["File Upload (CSV)"])
app.include_router(rag.router,        prefix="/rag",       tags=["RAG Engine"])
app.include_router(inventory.router,  prefix="/inventory", tags=["Inventory Management"])
app.include_router(agent.router,      prefix="/agent",     tags=["Multi-Agent Orchestrator"])

@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "online",
        "system": "SCM AI Control Tower v2",
        "agents_active": ["Inventory", "Supplier", "Shipment", "Report"],
        "api_key_configured": bool(os.getenv("GOOGLE_API_KEY")),
        "db_configured": bool(os.getenv("DATABASE_URL"))
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
