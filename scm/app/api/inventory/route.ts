import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("http://localhost:8000/inventory/", {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend inventory fetch failed" },
        { status: response.status }
      );
    }

    const items = await response.json();

    // 🔁 Adapt backend inventory → UI table rows
    const rows = items.map((item: any) => {
      const leadTimeDays = 7;          // static for now
      const avgDailyDemand = 10;       // static / placeholder
      const onHand = item.quantity_in_stock;
      const safetyStock = item.reorder_threshold;

      return {
        sku: item.product_id,
        warehouse: "Main Warehouse",
        onhand: onHand,
        safety: safetyStock,
        leadTime: leadTimeDays,
        avgDemand: avgDailyDemand,
        status: onHand <= safetyStock ? "Reorder" : "Normal",
      };
    });

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("Error fetching inventory data:", err);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
