import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json(); // Expecting { action, product_id?, query? }
    const response = await fetch("http://localhost:8000/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error("Error fetching agent data:", err);
    return NextResponse.json({ error: "failed to fetch agent data" }, { status: 500 });
  }
}
