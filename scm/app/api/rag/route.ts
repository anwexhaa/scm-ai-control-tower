import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Forward the POST request to your FastAPI backend
    const response = await fetch("http://localhost:8000/rag/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error("Error forwarding request:", err);
    return NextResponse.json({ error: "failed to fetch from backend" }, { status: 500 });
  }
}
