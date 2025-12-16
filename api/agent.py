from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import httpx  # for internal API calls

router = APIRouter()

# Models for agent input/output
class AgentRequest(BaseModel):
    action: str  # e.g. "check_inventory", "get_product_info", "ask_document"
    product_id: Optional[str] = None
    query: Optional[str] = None  # for rag or other queries

class AgentResponse(BaseModel):
    # Expanded model to include fields your frontend expects
    result: Optional[str] = None
    issue: Optional[Dict[str, Any]] = None
    recommendation: Optional[Dict[str, Any]] = None
    reasoning: Optional[str] = None
    context: Optional[str] = None

# Base URLs for your internal services (adjust as needed)
INVENTORY_SERVICE_URL = "http://localhost:8000/inventory"
RAG_SERVICE_URL = "http://localhost:8000/rag"

@router.post("/", response_model=AgentResponse)  # Changed from "/agent" to "/"
async def agent_controller(req: AgentRequest):
    async with httpx.AsyncClient() as client:
        if req.action == "check_inventory":
            if not req.product_id:
                raise HTTPException(status_code=400, detail="product_id is required for check_inventory")
            # Call inventory service to get item details
            resp = await client.get(f"{INVENTORY_SERVICE_URL}/{req.product_id}")
            if resp.status_code == 404:
                return AgentResponse(result=f"Product {req.product_id} not found in inventory.")
            resp.raise_for_status()
            item = resp.json()
            qty = item["quantity_in_stock"]
            reorder = item["reorder_threshold"]
            status = "below reorder threshold" if qty <= reorder else "sufficient stock"

            # Return detailed response for frontend display
            if qty <= reorder:
                return AgentResponse(
                    issue={"sku": req.product_id, "warehouse": item.get("warehouse", "Main Warehouse")},
                    recommendation={"qty": reorder * 2},  # example reorder qty (double threshold)
                    reasoning=f"Stock of {qty} is below reorder threshold ({reorder}). Reordering is recommended.",
                    context=f"Current stock: {qty}, reorder threshold: {reorder}",
                )
            else:
                return AgentResponse(
                    result=f"Product {req.product_id} has {qty} units in stock, which is sufficient stock."
                )

        elif req.action == "ask_document":
            if not req.query:
                raise HTTPException(status_code=400, detail="query is required for ask_document")
            # Call RAG service to answer query based on docs
            resp = await client.post(f"{RAG_SERVICE_URL}/query", json={"query": req.query})
            resp.raise_for_status()
            answer = resp.json().get("answer", "No answer found.")
            return AgentResponse(result=answer)

        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")
