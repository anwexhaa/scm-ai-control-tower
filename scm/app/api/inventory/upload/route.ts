import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const response = await fetch("http://localhost:8000/inventory/upload", {
      method: "POST",
      body: formData,
    });

    const text = await response.text();

    // Ensure JSON response
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: response.status });
    } catch {
      return NextResponse.json(
        { error: text || "Invalid response from server" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Upload proxy failed:", err);
    return NextResponse.json(
      { error: "Failed to upload CSV" },
      { status: 500 }
    );
  }
}
