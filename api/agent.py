from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal
from models import Inventory, Supplier, Shipment

from api.agents.supplier import SupplierAgent, SupplierProfile
from api.agents.shipment import ShipmentAgent, ShipmentRecord
from api.agents.report import ReportAgent, generate_report_pdf
from fastapi.responses import StreamingResponse
from io import BytesIO

router = APIRouter()

# ── Request / Response Models ────────────────────────────────

class AgentRequest(BaseModel):
    action: str
    product_id: Optional[str]  = None
    query: Optional[str]       = None
    quantity: Optional[int]    = 100
    urgency: Optional[str]     = "normal"
    shipment_id: Optional[str] = None

class AgentResponse(BaseModel):
    result: Optional[str]              = None
    issue: Optional[Dict[str, Any]]    = None
    recommendation: Optional[Any]     = None
    reasoning: Optional[str]          = None
    context: Optional[str]            = None
    kpis: Optional[Dict[str, Any]]    = None
    cascade_risk: Optional[str]       = None
    carrier_flag: Optional[str]       = None
    root_causes: Optional[List[str]]  = None
    forward_projections: Optional[List[str]] = None

# ── Initialize Agents ────────────────────────────────────────

supplier_ai = SupplierAgent()
shipment_ai = ShipmentAgent()
report_ai   = ReportAgent()

# ── DB Helpers ───────────────────────────────────────────────

async def fetch_inventory_from_db() -> List[dict]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Inventory).where(Inventory.is_active == True)
        )
        items = result.scalars().all()
        return [
            {
                "product_id":           i.product_id,
                "product_name":         i.product_name,
                "quantity_in_stock":    i.quantity_in_stock,
                "reorder_threshold":    i.reorder_threshold,
                "warehouse":            i.warehouse,
                "supplier_info":        i.supplier_info,
                "unit_cost":            i.unit_cost,
                "avg_daily_consumption": i.avg_daily_consumption,
                "lead_time_days":       i.lead_time_days,
            }
            for i in items
        ]

async def fetch_suppliers_from_db() -> List[dict]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Supplier).where(Supplier.is_active == True)
        )
        rows = result.scalars().all()
        return [
            {
                "supplier_name":         s.supplier_name,
                "base_cost_per_unit":    s.base_cost_per_unit,
                "on_time_delivery_rate": s.on_time_delivery_rate,
                "lead_time_days":        s.lead_time_days,
                "quality_rating":        s.quality_rating,
                "historical_issues":     s.historical_issues,
                "contact_info":          s.contact_info,
            }
            for s in rows
        ]

async def fetch_shipments_from_db() -> List[dict]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Shipment).where(Shipment.is_active == True)
        )
        rows = result.scalars().all()
        return [
            {
                "shipment_id":       s.shipment_id,
                "product_id":        s.product_id,
                "quantity":          s.quantity,
                "supplier":          s.supplier,
                "carrier":           s.carrier,
                "expected_delivery": s.expected_delivery,
                "actual_delivery":   s.actual_delivery,
                "is_on_time":        s.is_on_time,
                "carrier_avg_delay": s.carrier_avg_delay,
            }
            for s in rows
        ]

# ── Agent Controller ─────────────────────────────────────────

@router.post("/", response_model=AgentResponse)
async def agent_controller(req: AgentRequest):

    # ════════════════════════════════════════════════════════
    # ACTION 1: ANALYZE INVENTORY
    # ════════════════════════════════════════════════════════
    if req.action == "analyze_inventory":
        if not req.product_id:
            raise HTTPException(status_code=400, detail="product_id required")

        inventory = await fetch_inventory_from_db()
        item = next(
            (i for i in inventory
             if i["product_id"].lower() == req.product_id.lower()
             or req.product_id.lower() in i["product_name"].lower()),
            None
        )
        if not item:
            return AgentResponse(
                result=f"Product '{req.product_id}' not found. Upload an inventory CSV first."
            )

        # Resolve values with fallback
        avg_daily = item.get("avg_daily_consumption") or (
            item["reorder_threshold"] / 14 if item["reorder_threshold"] > 0 else 1.0
        )
        unit_cost  = item.get("unit_cost") or 10.0
        lead_time  = item.get("lead_time_days") or 7

        import math
        from datetime import datetime as dt

        month = dt.now().month
        multiplier = 0.9 if 1 <= month <= 3 else (1.4 if 10 <= month <= 12 else 1.0)
        adjusted   = avg_daily * multiplier

        safety_stock  = int(1.645 * 2.0 * math.sqrt(lead_time))
        reorder_point = (adjusted * lead_time) + safety_stock
        eoq           = int(math.sqrt((2 * adjusted * 365 * 50) / 5))
        days_left     = int(item["quantity_in_stock"] / adjusted) if adjusted > 0 else 999

        status = "Green"
        action = "No action required"
        if item["quantity_in_stock"] <= safety_stock:
            status = "Red"
            action = f"REORDER {eoq} units IMMEDIATELY"
        elif item["quantity_in_stock"] <= reorder_point:
            status = "Yellow"
            action = f"Place order for {eoq} units soon"

        # Cross-agent: check if a supplier exists for this product
        suppliers = await fetch_suppliers_from_db()
        supplier_hint = ""
        if item.get("supplier_info") and suppliers:
            matched = next(
                (s for s in suppliers
                 if item["supplier_info"].lower() in s["supplier_name"].lower()
                 or s["supplier_name"].lower() in item["supplier_info"].lower()),
                None
            )
            if matched:
                supplier_hint = (
                    f" Linked supplier '{matched['supplier_name']}' has "
                    f"{matched['on_time_delivery_rate']*100:.0f}% on-time rate."
                )

        return AgentResponse(
            result=f"Analysis Complete: {status} Status",
            issue={"days_left": days_left, "severity": status},
            recommendation={
                "action":        action,
                "eoq":           eoq,
                "safety_stock":  safety_stock,
                "estimated_cost": round(eoq * unit_cost, 2)
            },
            reasoning=(
                f"Stock ({item['quantity_in_stock']}) vs Reorder Point ({reorder_point:.1f}). "
                f"Seasonal: {multiplier}x. Lead time: {lead_time}d.{supplier_hint}"
            ),
            context=f"Reorder Point: {reorder_point:.0f} units | Days until stockout: {days_left}"
        )

    # ════════════════════════════════════════════════════════
    # ACTION 2: SELECT SUPPLIER
    # ════════════════════════════════════════════════════════
    elif req.action == "select_supplier":
        if not req.quantity:
            raise HTTPException(status_code=400, detail="quantity required")

        supplier_rows = await fetch_suppliers_from_db()

        if not supplier_rows:
            return AgentResponse(
                result="No suppliers found in database.",
                context="Please upload a suppliers CSV via POST /upload/preview first."
            )

        # Convert DB rows to SupplierProfile objects
        profiles = [
            SupplierProfile(
                name=s["supplier_name"],
                base_cost_per_unit=float(s["base_cost_per_unit"]),
                on_time_delivery_rate=float(s["on_time_delivery_rate"]),
                lead_time_days=int(s["lead_time_days"]),
                quality_rating=float(s["quality_rating"]),
                historical_issues=int(s["historical_issues"]),
                contact_info=s.get("contact_info")
            )
            for s in supplier_rows
        ]

        is_urgent = req.urgency in ["urgent", "immediate"]
        scores    = await supplier_ai.select_best_supplier(profiles, req.quantity, is_urgent)
        best      = scores[0]

        return AgentResponse(
            result=f"✓ Recommended Supplier: {best.name}",
            recommendation={
                "best_supplier":    best.dict(),
                "all_suppliers":    [s.dict() for s in scores],
                "comparison_count": len(scores),
                "weights_used":     supplier_ai.get_dynamic_weights(is_urgent, req.quantity)
            },
            reasoning=best.reasoning,
            context=(
                f"Urgency: {req.urgency} | "
                f"Quantity: {req.quantity} | "
                f"Total Cost: ${best.total_cost:,.2f} | "
                f"Risk: {best.risk_score:.1%} | "
                f"Rank 1 of {len(scores)}"
            )
        )

    # ════════════════════════════════════════════════════════
    # ACTION 3: TRACK SHIPMENT
    # ════════════════════════════════════════════════════════
    elif req.action == "track_shipment":
        if not req.shipment_id:
            raise HTTPException(status_code=400, detail="shipment_id required")

        all_shipments = await fetch_shipments_from_db()
        inventory     = await fetch_inventory_from_db()

        # Find the specific shipment
        shipment_data = next(
            (s for s in all_shipments
             if s["shipment_id"].lower() == req.shipment_id.lower()),
            None
        )

        if not shipment_data:
            return AgentResponse(
                result=f"Shipment '{req.shipment_id}' not found in database.",
                context="Upload a shipments CSV via POST /upload/preview first."
            )

        record = ShipmentRecord(
            urgency_factor=1.5 if req.urgency in ["urgent", "immediate"] else 1.0,
            **{k: v for k, v in shipment_data.items() if k != "is_on_time"},
            is_on_time=shipment_data.get("is_on_time")
        )

        analysis = await shipment_ai.analyze_shipment(
            record,
            all_shipments=all_shipments,
            inventory_items=inventory
        )

        return AgentResponse(
            result=f"Shipment {req.shipment_id}: {analysis.risk_level}",
            issue={
                "risk":            analysis.risk_level,
                "predicted_delay": analysis.predicted_delay_days
            },
            recommendation={
                "actions":            analysis.recommended_actions,
                "alternative_routes": analysis.alternative_routes
            },
            reasoning=analysis.reasoning,
            context=f"Confidence: {analysis.confidence_score:.0%}",
            cascade_risk=analysis.cascade_risk,
            carrier_flag=analysis.carrier_reliability
        )

    # ════════════════════════════════════════════════════════
    # ACTION 4: GENERATE REPORT
    # ════════════════════════════════════════════════════════
    elif req.action == "generate_report":
        inventory = await fetch_inventory_from_db()
        shipments = await fetch_shipments_from_db()
        suppliers = await fetch_suppliers_from_db()

        if not inventory:
            return AgentResponse(
                result="No inventory data found.",
                context="Upload an inventory CSV first."
            )

        report = await report_ai.create_weekly_report(inventory, shipments, suppliers)

        return AgentResponse(
            result="Executive Report Generated Successfully",
            kpis=report.kpis.dict(),
            recommendation=report.recommendations,
            reasoning=report.executive_summary,
            context=(
                f"Analyzed {len(inventory)} inventory items, "
                f"{len(shipments)} shipments, "
                f"{len(suppliers)} suppliers | {report.timestamp}"
            ),
            root_causes=report.root_causes,
            forward_projections=report.forward_projections
        )

    # ════════════════════════════════════════════════════════
    # ACTION 5: ASK DOCUMENT (RAG)
    # ════════════════════════════════════════════════════════
    elif req.action == "ask_document":
        if not req.query:
            raise HTTPException(status_code=400, detail="query required")

        import httpx
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "http://127.0.0.1:8000/rag/",
                    json={"question": req.query}
                )
                resp.raise_for_status()
                data = resp.json()

            return AgentResponse(
                result=data.get("answer", "No answer found"),
                context=f"Sources: {len(data.get('sources', []))} documents",
                recommendation={"sources": data.get("sources", [])}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")

    # ════════════════════════════════════════════════════════
    # ACTION 6: FULL ASSESSMENT (cross-agent, demo highlight)
    # ════════════════════════════════════════════════════════
    elif req.action == "full_assessment":
        """
        Runs all agents in sequence and returns a unified view.
        Inventory → Supplier recommendation → Shipment risks → Report KPIs
        This is the 'wow' endpoint for demos.
        """
        inventory = await fetch_inventory_from_db()
        shipments = await fetch_shipments_from_db()
        suppliers = await fetch_suppliers_from_db()

        if not inventory:
            return AgentResponse(
                result="No data found. Upload inventory, supplier, and shipment CSVs first."
            )

        import math
        from datetime import datetime as dt

        # 1. Find all critical (Red) inventory items
        month      = dt.now().month
        multiplier = 0.9 if 1 <= month <= 3 else (1.4 if 10 <= month <= 12 else 1.0)

        critical_items = []
        for item in inventory:
            avg_daily = item.get("avg_daily_consumption") or (
                item["reorder_threshold"] / 14 if item["reorder_threshold"] > 0 else 1.0
            )
            lead_time    = item.get("lead_time_days") or 7
            adjusted     = avg_daily * multiplier
            safety_stock = int(1.645 * 2.0 * math.sqrt(lead_time))
            reorder_pt   = (adjusted * lead_time) + safety_stock

            if item["quantity_in_stock"] <= safety_stock:
                critical_items.append({**item, "status": "Red", "reorder_point": reorder_pt})
            elif item["quantity_in_stock"] <= reorder_pt:
                critical_items.append({**item, "status": "Yellow", "reorder_point": reorder_pt})

        # 2. Supplier recommendation for critical items
        supplier_rec = None
        if suppliers and critical_items:
            profiles = [
                SupplierProfile(
                    name=s["supplier_name"],
                    base_cost_per_unit=float(s["base_cost_per_unit"]),
                    on_time_delivery_rate=float(s["on_time_delivery_rate"]),
                    lead_time_days=int(s["lead_time_days"]),
                    quality_rating=float(s["quality_rating"]),
                    historical_issues=int(s["historical_issues"])
                )
                for s in suppliers
            ]
            scores       = await supplier_ai.select_best_supplier(profiles, req.quantity or 100, False)
            supplier_rec = scores[0].dict() if scores else None

        # 3. Shipment risks
        high_risk_shipments = []
        for s in shipments:
            record = ShipmentRecord(
                shipment_id=s["shipment_id"],
                product_id=s.get("product_id"),
                quantity=s.get("quantity"),
                supplier=s.get("supplier"),
                carrier=s.get("carrier"),
                expected_delivery=s.get("expected_delivery") or "2026-12-31",
                carrier_avg_delay=float(s.get("carrier_avg_delay") or 0),
            )
            analysis = await shipment_ai.analyze_shipment(
                record,
                all_shipments=shipments,
                inventory_items=inventory
            )
            if analysis.risk_level == "High Risk":
                high_risk_shipments.append({
                    "shipment_id":     s["shipment_id"],
                    "risk":            analysis.risk_level,
                    "cascade":         analysis.cascade_risk,
                    "carrier_flag":    analysis.carrier_reliability,
                    "predicted_delay": analysis.predicted_delay_days
                })

        # 4. Report KPIs
        report = await report_ai.create_weekly_report(inventory, shipments, suppliers)

        return AgentResponse(
            result=f"Full Assessment Complete — {len(critical_items)} items need attention",
            kpis=report.kpis.dict(),
            issue={
                "critical_inventory_items": len(critical_items),
                "red_items":    [i["product_name"] for i in critical_items if i["status"] == "Red"],
                "yellow_items": [i["product_name"] for i in critical_items if i["status"] == "Yellow"],
                "high_risk_shipments": len(high_risk_shipments)
            },
            recommendation={
                "best_supplier":      supplier_rec,
                "report_actions":     report.recommendations,
                "high_risk_shipments": high_risk_shipments[:5]
            },
            reasoning=report.executive_summary,
            context=(
                f"{len(inventory)} products | "
                f"{len(suppliers)} suppliers | "
                f"{len(shipments)} shipments analyzed | "
                f"{report.timestamp}"
            ),
            root_causes=report.root_causes,
            forward_projections=report.forward_projections
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")
    # ── PDF Download Endpoint ────────────────────────────────────
# Frontend: <button onClick={() => window.open('http://localhost:8000/agent/report/pdf')}>
#           Download Report PDF
#           </button>

@router.get("/report/pdf")
async def download_report_pdf():
    inventory = await fetch_inventory_from_db()
    shipments = await fetch_shipments_from_db()
    suppliers = await fetch_suppliers_from_db()

    if not inventory:
        raise HTTPException(
            status_code=400,
            detail="No inventory data found. Upload an inventory CSV first."
        )

    report    = await report_ai.create_weekly_report(inventory, shipments, suppliers)
    pdf_bytes = generate_report_pdf(report)
    filename  = f"scm_report_{report.timestamp.replace(' ', '_').replace(':', '-')}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )