import os
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from datetime import datetime

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")


class ReportKPIs(BaseModel):
    inventory_health: float
    shipment_on_time_rate: float
    supplier_health_score: float
    critical_alerts_count: int
    items_below_reorder: int
    projected_stockouts_14d: int


class ExecutiveReport(BaseModel):
    timestamp: str
    kpis: ReportKPIs
    executive_summary: str
    recommendations: List[str]
    root_causes: List[str]
    forward_projections: List[str]


class ReportAgent:
    def __init__(self):
        self.target_health = 90.0

    # ── KPI 1: Inventory Health ──────────────────────────────

    def calculate_inventory_health(self, items: List[dict]) -> float:
        """(1 - low_stock_items / total) × 100"""
        if not items:
            return 0.0
        low_stock = sum(
            1 for item in items
            if item.get("quantity_in_stock", 0) < item.get("reorder_threshold", 0)
        )
        return round((1 - (low_stock / len(items))) * 100, 2)

    # ── KPI 2: Shipment On-Time Rate ─────────────────────────

    def calculate_shipment_on_time(self, shipments: List[dict]) -> float:
        """on_time / total × 100"""
        if not shipments:
            return 0.0
        on_time = sum(
            1 for s in shipments
            if str(s.get("is_on_time", "")).lower() in ["true", "1", "yes"]
        )
        return round((on_time / len(shipments)) * 100, 2)

    # ── KPI 3: Supplier Health ───────────────────────────────

    def calculate_supplier_health(self, suppliers: List[dict]) -> float:
        """
        Weighted average: on_time_rate (50%) + quality/5 (30%) + (1 - issues×0.1) (20%)
        """
        if not suppliers:
            return 0.0
        scores = []
        for s in suppliers:
            on_time  = float(s.get("on_time_delivery_rate", 0.8))
            quality  = float(s.get("quality_rating", 3.0)) / 5
            issues   = int(s.get("historical_issues", 0))
            issue_penalty = max(0, 1 - (issues * 0.1))
            score = (on_time * 0.5) + (quality * 0.3) + (issue_penalty * 0.2)
            scores.append(score)
        return round((sum(scores) / len(scores)) * 100, 2)

    # ── KPI 4: Forward Projections ───────────────────────────

    def calculate_forward_projections(self, items: List[dict]) -> tuple[int, List[str]]:
        """
        Projects which products will hit stockout in next 14 days.
        Uses avg_daily_consumption from DB if available, estimates otherwise.
        Returns (count, list of product warnings)
        """
        warnings    = []
        stockout_count = 0

        for item in items:
            stock     = item.get("quantity_in_stock", 0)
            threshold = item.get("reorder_threshold", 0)
            avg_daily = item.get("avg_daily_consumption")

            if not avg_daily or avg_daily <= 0:
                avg_daily = threshold / 14 if threshold > 0 else 1.0

            days_left = int(stock / avg_daily) if avg_daily > 0 else 999

            if days_left <= 14:
                stockout_count += 1
                warnings.append(
                    f"{item.get('product_name', 'Unknown')} "
                    f"(stock: {stock}, ~{days_left}d remaining)"
                )

        return stockout_count, warnings

    # ── Root Cause Detection ─────────────────────────────────

    def detect_root_causes(
        self,
        items: List[dict],
        shipments: List[dict],
        suppliers: List[dict]
    ) -> List[str]:
        """
        Identifies patterns that explain poor KPIs.
        Examples:
        - Multiple stockouts from same supplier
        - Specific carrier causing delays
        - Specific warehouse with inventory issues
        """
        causes = []

        # Pattern 1: Supplier linked to multiple low-stock items
        supplier_issues: Dict[str, int] = {}
        for item in items:
            if item.get("quantity_in_stock", 0) < item.get("reorder_threshold", 0):
                supplier = item.get("supplier_info", "Unknown")
                supplier_issues[supplier] = supplier_issues.get(supplier, 0) + 1

        for supplier, count in supplier_issues.items():
            if count >= 2:
                causes.append(
                    f"Supplier '{supplier}' linked to {count} low-stock products — "
                    f"review supplier reliability or lead times."
                )

        # Pattern 2: Carrier with high delay rate
        carrier_delays: Dict[str, list] = {}
        for s in shipments:
            carrier   = s.get("carrier", "Unknown")
            is_on_time = str(s.get("is_on_time", "1")).lower() in ["true", "1", "yes"]
            if carrier not in carrier_delays:
                carrier_delays[carrier] = []
            carrier_delays[carrier].append(is_on_time)

        for carrier, records in carrier_delays.items():
            if len(records) >= 3:
                late_rate = 1 - (sum(records) / len(records))
                if late_rate > 0.5:
                    causes.append(
                        f"Carrier '{carrier}' has {late_rate*100:.0f}% late rate "
                        f"over {len(records)} shipments — consider switching carriers."
                    )

        # Pattern 3: Warehouse concentration risk
        warehouse_issues: Dict[str, int] = {}
        for item in items:
            if item.get("quantity_in_stock", 0) < item.get("reorder_threshold", 0):
                wh = item.get("warehouse", "Unknown")
                warehouse_issues[wh] = warehouse_issues.get(wh, 0) + 1

        for wh, count in warehouse_issues.items():
            if count >= 3:
                causes.append(
                    f"Warehouse '{wh}' has {count} products below reorder threshold — "
                    f"check replenishment process for this location."
                )

        # Pattern 4: Suppliers with high historical issues
        for s in suppliers:
            issues = int(s.get("historical_issues", 0))
            if issues >= 2:
                causes.append(
                    f"Supplier '{s.get('supplier_name', 'Unknown')}' has "
                    f"{issues} recorded incidents — assess risk of continued use."
                )

        return causes if causes else ["No significant root causes detected in current data."]

    # ── LLM Executive Summary ────────────────────────────────

    async def generate_summary(
        self,
        kpis: ReportKPIs,
        root_causes: List[str],
        projections: List[str]
    ) -> str:
        causes_text      = "\n".join(f"- {c}" for c in root_causes)
        projections_text = "\n".join(f"- {p}" for p in projections) if projections else "None"

        prompt = f"""
You are a senior supply chain analyst writing an executive summary for a weekly report.

Current KPIs:
- Inventory Health: {kpis.inventory_health}% (Target: 90%)
- Shipment On-Time Rate: {kpis.shipment_on_time_rate}%
- Supplier Health Score: {kpis.supplier_health_score}%
- Critical Alerts: {kpis.critical_alerts_count}
- Items Below Reorder: {kpis.items_below_reorder}
- Products Projected to Stockout in 14 Days: {kpis.projected_stockouts_14d}

Root Causes Identified:
{causes_text}

Products at Stockout Risk:
{projections_text}

Write a concise 3-4 sentence executive summary. Be direct about risks.
Focus on what needs immediate attention and why. Do not use bullet points.
"""
        response = await model.generate_content_async(prompt)
        return response.text.strip()

    # ── Master Report Function ───────────────────────────────

    async def create_weekly_report(
        self,
        inventory_data: List[dict],
        shipment_data: List[dict],
        supplier_data: List[dict] = None
    ) -> ExecutiveReport:

        suppliers = supplier_data or []

        # Calculate all KPIs
        inv_health   = self.calculate_inventory_health(inventory_data)
        ship_rate    = self.calculate_shipment_on_time(shipment_data)
        supp_health  = self.calculate_supplier_health(suppliers)

        critical_count = sum(
            1 for item in inventory_data
            if item.get("quantity_in_stock", 0) < (item.get("reorder_threshold", 0) * 0.5)
        )
        below_reorder = sum(
            1 for item in inventory_data
            if item.get("quantity_in_stock", 0) < item.get("reorder_threshold", 0)
        )

        stockout_count, stockout_warnings = self.calculate_forward_projections(inventory_data)

        kpis = ReportKPIs(
            inventory_health=inv_health,
            shipment_on_time_rate=ship_rate,
            supplier_health_score=supp_health,
            critical_alerts_count=critical_count,
            items_below_reorder=below_reorder,
            projected_stockouts_14d=stockout_count
        )

        root_causes = self.detect_root_causes(inventory_data, shipment_data, suppliers)

        summary = await self.generate_summary(kpis, root_causes, stockout_warnings)

        # Dynamic recommendations based on actual data
        recommendations = []
        if inv_health < 90:
            recommendations.append(
                f"Inventory health at {inv_health}% — below 90% target. "
                f"Initiate reorder for {below_reorder} products immediately."
            )
        if stockout_count > 0:
            recommendations.append(
                f"{stockout_count} products projected to stockout within 14 days: "
                + ", ".join(stockout_warnings[:3])
                + ("..." if len(stockout_warnings) > 3 else "")
            )
        if ship_rate < 85:
            recommendations.append(
                f"Shipment on-time rate at {ship_rate}% — review carrier contracts "
                f"and consider switching underperforming carriers."
            )
        if supp_health < 75:
            recommendations.append(
                f"Supplier health score at {supp_health}% — audit suppliers with "
                f"historical issues and low quality ratings."
            )
        if not recommendations:
            recommendations.append(
                "All KPIs within acceptable ranges. Continue monitoring."
            )

        return ExecutiveReport(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
            kpis=kpis,
            executive_summary=summary,
            recommendations=recommendations,
            root_causes=root_causes,
            forward_projections=stockout_warnings
        )