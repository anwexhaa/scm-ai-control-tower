"use client";
import FileUpload from "../components/FileUpload";
import Card from "../components/Card";
import { useState, useEffect } from "react";

export default function UploadPage() {
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    // fetch initial list
    async function load() {
      const res = await fetch("/api/upload");
      const json = await res.json();
      setFiles(json.files || []);
    }
    load();
  }, []);

  // Calculate some status info for display
  const totalFiles = files.length;
  // Placeholder for total chunks if backend provides it later, else 0
  const totalChunks = files.reduce((acc, f) => acc + (f.chunks || 0), 0);
  // Last uploaded file info
  const lastUploaded = totalFiles > 0 ? files[totalFiles - 1] : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Upload Knowledge</h1>
      <p className="text-sm text-gray-400 mb-6">
        Upload supply chain documents for RAG ingestion.
      </p>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card title="Upload Documents">
            <FileUpload
              onDone={async () => {
                const res = await fetch("/api/upload");
                const json = await res.json();
                setFiles(json.files || []);
              }}
            />
          </Card>

          <Card className="mt-4" title="Knowledge Base">
            <div className="space-y-2">
              {files.length === 0 && (
                <div className="text-sm text-gray-400">
                  No documents uploaded yet.
                </div>
              )}
              {files.map((f: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-[#0f172a] p-3 rounded-lg text-sm text-gray-200 border border-gray-700"
                >
                  <div>{f.name}</div>
                  <div className="text-gray-400">
                    {f.status} · {f.size}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Status">
            <div className="text-sm text-gray-300 space-y-1">
              <div>Total files uploaded: {totalFiles}</div>
              {/* <div>Total chunks indexed: {totalChunks}</div> */}
              {lastUploaded && (
                <div>
                  Last upload: <strong>{lastUploaded.name}</strong> ({lastUploaded.status})
                </div>
              )}
              <div>Uploads are processed and indexed into chunks for RAG retrieval.</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
