"use client";
import { useState, useRef } from "react";

export default function FileUpload({ onDone }: { onDone?: (chunksAdded: number) => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function sendFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setStatus("Uploading...");
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", f);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Upload failed");
      setStatus(
        `Documents indexed successfully. Chunks created: ${json.chunks_added || 0}`
      );

      // Pass chunks_added to onDone callback
      onDone?.(json.chunks_added || 0);
    } catch (err: any) {
      setError(err.message || String(err));
      setStatus(null);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files)); // store selected files to show names
      sendFiles(files);
    }
  }

  return (
    <div>
      <label className="block">
        <div className="border-2 border-dashed border-gray-600 rounded-lg h-40 flex flex-col items-center justify-center text-gray-400 mb-4 cursor-pointer hover:border-gray-500">
          {selectedFiles.length === 0 ? (
            <>
              <div>Click to upload or drag & drop</div>
              <div className="text-xs mt-2">PDF, TXT, DOCX (max 10MB)</div>
            </>
          ) : (
            <div className="text-gray-200 space-y-1">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="text-sm">
                  {file.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          onChange={onFileChange}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.txt,.docx"
        />
      </label>

      <div className="flex gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm"
        >
          Upload
        </button>
        <div className="text-sm text-gray-300">{status}</div>
      </div>
      {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
    </div>
  );
}
