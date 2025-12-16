from fastapi import FastAPI
from dotenv import load_dotenv
  # ✅ ADD THIS
load_dotenv()
from api import upload, rag, inventory, agent

  # ✅ LOAD ENV VARIABLES BEFORE ROUTES

app = FastAPI()

app.include_router(upload.router, prefix="/upload", tags=["upload"])
app.include_router(rag.router, prefix="/rag", tags=["rag"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
