import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("http://localhost:8000/upload/");
    if (!response.ok) {
      return NextResponse.json({ files: [] }); // fallback empty list if error
    }
    const data = await response.json();
    return NextResponse.json({ files: data.files || [] });
  } catch (error) {
    return NextResponse.json({ files: [] });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files");

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const backendForm = new FormData();
    for (const file of files) {
      backendForm.append("files", file);
    }

    const response = await fetch("http://localhost:8000/upload/", {
      method: "POST",
      body: backendForm,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.detail || "Upload failed" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
