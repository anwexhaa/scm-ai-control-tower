"use client";
import { useEffect, useState, useRef } from "react";
import Card from "../components/Card";
import InventoryTable from "../components/InventoryTable";

export default function InventoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadInventory() {
    try {
      const res = await fetch("/api/inventory", { cache: "no-store" });
      const json = await res.json();

      // ✅ ALWAYS ensure rows is an array
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e) {
      console.error("Failed to load inventory:", e);
      setRows([]);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setUploadError("Please upload a valid CSV file.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/inventory/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setUploadError(err.detail || "Failed to upload CSV.");
      } else {
        await loadInventory();
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      setUploadError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Inventory</h1>
      <p className="text-sm text-gray-400 mb-6">
        Structured inventory data used by the agent.
      </p>

      <Card>
        <div className="mb-4 flex items-center gap-4">
          <label
            htmlFor="csv-upload"
            className="bg-[#0f172a] px-3 py-2 rounded cursor-pointer hover:bg-gray-800 transition"
          >
            {loading ? "Uploading..." : "Upload CSV"}
          </label>

          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
            ref={inputRef}
            disabled={loading}
          />

          {uploadError && (
            <div className="text-red-500 text-sm">{uploadError}</div>
          )}
        </div>

        {/* ✅ rows is guaranteed to be an array */}
        <InventoryTable rows={rows} />
      </Card>
    </div>
  );
}
