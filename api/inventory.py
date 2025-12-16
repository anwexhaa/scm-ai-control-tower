from fastapi import APIRouter, HTTPException, Response, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional
import csv
import os
from threading import Lock
from io import StringIO

router = APIRouter()

CSV_FILE = "inventory.csv"
lock = Lock()  # To avoid race conditions on file access


class InventoryItem(BaseModel):
    product_id: str = Field(..., example="P001")
    product_name: str = Field(..., example="Widget A")
    quantity_in_stock: int = Field(..., ge=0, example=100)
    reorder_threshold: int = Field(..., ge=0, example=20)
    supplier_info: Optional[str] = Field(None, example="Supplier X")


def load_inventory() -> List[InventoryItem]:
    items = []
    if not os.path.exists(CSV_FILE):
        return items

    with lock, open(CSV_FILE, newline="", mode="r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            items.append(
                InventoryItem(
                    product_id=row["product_id"],
                    product_name=row["product_name"],
                    quantity_in_stock=int(row["quantity_in_stock"]),
                    reorder_threshold=int(row["reorder_threshold"]),
                    supplier_info=row.get("supplier_info") or None,
                )
            )
    return items


def save_inventory(items: List[InventoryItem]):
    with lock, open(CSV_FILE, mode="w", newline="") as f:
        fieldnames = [
            "product_id",
            "product_name",
            "quantity_in_stock",
            "reorder_threshold",
            "supplier_info",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for item in items:
            writer.writerow(item.dict())


# ----------------------------
# CSV UPLOAD (MUST BE ABOVE /{product_id})
# ----------------------------
@router.post("/upload", status_code=200)
async def upload_inventory_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    try:
        content = (await file.read()).decode("utf-8")
        reader = csv.DictReader(StringIO(content))

        required_fields = {
            "product_id",
            "product_name",
            "quantity_in_stock",
            "reorder_threshold",
        }

        if not required_fields.issubset(reader.fieldnames or []):
            raise HTTPException(
                status_code=400,
                detail=f"CSV must contain headers: {required_fields}",
            )

        items: List[InventoryItem] = []

        for row in reader:
            items.append(
                InventoryItem(
                    product_id=row["product_id"],
                    product_name=row["product_name"],
                    quantity_in_stock=int(row["quantity_in_stock"]),
                    reorder_threshold=int(row["reorder_threshold"]),
                    supplier_info=row.get("supplier_info") or None,
                )
            )

        save_inventory(items)
        return {
            "message": "Inventory uploaded successfully",
            "items_uploaded": len(items),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ----------------------------
# CRUD ROUTES
# ----------------------------
@router.get("/", response_model=List[InventoryItem])
def get_inventory():
    return load_inventory()


@router.get("/{product_id}", response_model=InventoryItem)
def get_item(product_id: str):
    items = load_inventory()
    for item in items:
        if item.product_id == product_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")


@router.post("/", response_model=InventoryItem, status_code=201)
def create_item(item: InventoryItem):
    items = load_inventory()
    if any(existing.product_id == item.product_id for existing in items):
        raise HTTPException(status_code=400, detail="Product ID already exists")
    items.append(item)
    save_inventory(items)
    return item


@router.put("/{product_id}", response_model=InventoryItem)
def update_item(product_id: str, updated: InventoryItem):
    items = load_inventory()
    for idx, item in enumerate(items):
        if item.product_id == product_id:
            items[idx] = updated
            save_inventory(items)
            return updated
    raise HTTPException(status_code=404, detail="Item not found")


@router.delete("/{product_id}", status_code=204)
def delete_item(product_id: str):
    items = load_inventory()
    new_items = [item for item in items if item.product_id != product_id]
    if len(new_items) == len(items):
        raise HTTPException(status_code=404, detail="Item not found")
    save_inventory(new_items)
    return Response(status_code=204)
