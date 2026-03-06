// "use client";

// import { FormEvent, useEffect, useState } from "react";
// import { api } from "@/lib/api";
// import type { CommitResult, ConflictItem, FileRecord, UploadPreviewResponse } from "@/lib/types";

// export default function UploadsPage() {
//   const [csvFile, setCsvFile] = useState<File | null>(null);
//   const [pdfFiles, setPdfFiles] = useState<File[]>([]);
//   const [preview, setPreview] = useState<UploadPreviewResponse | null>(null);
//   const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
//   const [pdfResult, setPdfResult] = useState("");
//   const [files, setFiles] = useState<FileRecord[]>([]);
//   const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   async function loadMeta() {
//     try {
//       const [fileRows, conflictRows] = await Promise.all([api.listUploadedFiles(), api.listConflicts()]);
//       setFiles(fileRows);
//       setConflicts(conflictRows);
//     } catch {
//       // keep page functional even when metadata fetch fails
//     }
//   }

//   useEffect(() => {
//     void loadMeta();
//   }, []);

//   async function onCsvPreview(e: FormEvent) {
//     e.preventDefault();
//     if (!csvFile) return;
//     setLoading(true);
//     setError("");
//     try {
//       const result = await api.previewCsv(csvFile);
//       setPreview(result);
//       setCommitResult(null);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "CSV preview failed");
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function onCsvCommit() {
//     if (!preview) return;
//     setLoading(true);
//     setError("");
//     try {
//       const result = await api.commitCsv({ file_id: preview.file_id });
//       setCommitResult(result);
//       await loadMeta();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "CSV commit failed");
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function onPdfUpload(e: FormEvent) {
//     e.preventDefault();
//     if (pdfFiles.length === 0) return;
//     setLoading(true);
//     setError("");
//     try {
//       const result = await api.uploadPdf(pdfFiles);
//       setPdfResult(`Indexed ${result.chunks_added} chunks.`);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "PDF upload failed");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <main className="page-wrap">
//       <section className="page-hero">
//         <h1>Data Ingestion</h1>
//         <p>Process structured CSVs and index document PDFs for downstream analysis.</p>
//       </section>

//       {error ? <p className="banner banner-danger">{error}</p> : null}
//       {loading ? <p className="banner">Running upload workflow...</p> : null}
//       {commitResult ? <p className="banner banner-success">{commitResult.message}</p> : null}
//       {pdfResult ? <p className="banner banner-success">{pdfResult}</p> : null}

//       <section className="page-grid grid-2">
//         <article className="card">
//           <h3>CSV Preview and Commit</h3>
//           <form className="stack" onSubmit={onCsvPreview}>
//             <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
//             <button className="button" type="submit">Preview CSV</button>
//           </form>

//           {preview ? (
//             <div className="stack" style={{ marginTop: 12 }}>
//               <div className="kv"><span>File Type</span><strong>{preview.file_type}</strong></div>
//               <div className="kv"><span>Total Rows</span><strong>{preview.total_rows}</strong></div>
//               <p className="muted">{preview.message}</p>
//               <button className="button button-ghost" type="button" onClick={() => void onCsvCommit()}>
//                 Commit Upload
//               </button>
//             </div>
//           ) : null}
//         </article>

//         <article className="card">
//           <h3>PDF Indexing</h3>
//           <form className="stack" onSubmit={onPdfUpload}>
//             <input type="file" multiple accept=".pdf" onChange={(e) => setPdfFiles(Array.from(e.target.files ?? []))} />
//             <button className="button" type="submit">Index PDF Files</button>
//           </form>
//         </article>
//       </section>

//       <section className="page-grid grid-2">
//         <article className="card">
//           <h3>Upload History</h3>
//           <div className="table-wrap">
//             <table>
//               <thead>
//                 <tr>
//                   <th>Filename</th>
//                   <th>Type</th>
//                   <th>Rows</th>
//                   <th>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {files.slice(0, 15).map((f) => (
//                   <tr key={f.file_id}>
//                     <td>{f.filename}</td>
//                     <td>{f.file_type}</td>
//                     <td>{f.row_count}</td>
//                     <td>{f.status}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </article>

//         <article className="card">
//           <h3>Conflict Log</h3>
//           <div className="table-wrap">
//             <table>
//               <thead>
//                 <tr>
//                   <th>Product</th>
//                   <th>Field</th>
//                   <th>Resolution</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {conflicts.slice(0, 15).map((c) => (
//                   <tr key={c.id}>
//                     <td>{c.product_name}</td>
//                     <td>{c.field}</td>
//                     <td>{c.resolution ?? "pending"}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </article>
//       </section>
//     </main>
//   );
// }
"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CommitRequest, CommitResult, ConflictItem, FileRecord, UploadPreviewResponse } from "@/lib/types";

type ConflictResolution = "use_existing" | "use_incoming" | "keep_both";

export default function UploadsPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<UploadPreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [pdfResult, setPdfResult] = useState("");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Record<number, ConflictResolution>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMeta() {
    try {
      const [fileRows, conflictRows] = await Promise.all([api.listUploadedFiles(), api.listConflicts()]);
      setFiles(fileRows);
      setConflicts(conflictRows);
    } catch { /* keep functional */ }
  }

  useEffect(() => { void loadMeta(); }, []);

  async function onCsvPreview(e: FormEvent) {
    e.preventDefault();
    if (!csvFile) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.previewCsv(csvFile);
      setPreview(result);
      setCommitResult(null);
      setConflictResolutions({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function onCsvCommit() {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      const payload: CommitRequest = {
        file_id: preview.file_id,
        conflict_resolutions: Object.entries(conflictResolutions).map(([idx, res]) => {
          const c = (preview.conflicts[Number(idx)] as Record<string, string>) ?? {};
          return {
            product_name: c.product_name ?? "",
            field_name: c.field ?? "",
            resolution: res,
          };
        }),
      };
      const result = await api.commitCsv(payload);
      setCommitResult(result);
      await loadMeta();
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV commit failed");
    } finally {
      setLoading(false);
    }
  }

  async function onPdfUpload(e: FormEvent) {
    e.preventDefault();
    if (pdfFiles.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.uploadPdf(pdfFiles);
      setPdfResult(`Indexed ${result.chunks_added} chunks from ${pdfFiles.length} file(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF upload failed");
    } finally {
      setLoading(false);
    }
  }

  function setResolution(idx: number, res: ConflictResolution) {
    setConflictResolutions((prev) => ({ ...prev, [idx]: res }));
  }

  return (
    <main className="page-wrap">
      <section className="page-hero">
        <h1>Data Ingestion</h1>
        <p>Process structured CSVs and index document PDFs for downstream analysis.</p>
      </section>

      {error && <p className="banner banner-danger">{error}</p>}
      {loading && <p className="banner">Running upload workflow...</p>}
      {commitResult && <p className="banner banner-success">{commitResult.message} — {commitResult.rows_saved} rows saved.</p>}
      {pdfResult && <p className="banner banner-success">{pdfResult}</p>}

      <section className="page-grid grid-2">
        {/* CSV */}
        <article className="card">
          <h3>CSV Upload — Preview & Commit</h3>
          <form className="stack" onSubmit={onCsvPreview}>
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
            <button className="button" type="submit" disabled={!csvFile || loading}>
              Preview with Gemini
            </button>
          </form>

          {preview && (
            <div className="stack" style={{ marginTop: 4 }}>
              <div className="kv"><span>Detected Type</span><strong>{preview.file_type}</strong></div>
              <div className="kv"><span>Total Rows</span><strong>{preview.total_rows}</strong></div>
              <div className="kv"><span>Can Commit</span>
                <span className={preview.can_commit ? "pill pill-success" : "pill pill-danger"}>
                  {preview.can_commit ? "Yes" : "No"}
                </span>
              </div>
              <p className="muted">{preview.message}</p>

              {/* Column Mapping */}
              {Object.keys(preview.column_mapping).length > 0 && (
                <div>
                  <div className="section-label" style={{ marginBottom: 8 }}>Column Mapping</div>
                  {Object.entries(preview.column_mapping).map(([from, to]) => (
                    <div key={from} className="mapping-row">
                      <span className="mapping-from">{from}</span>
                      <span className="mapping-arrow">→</span>
                      <span className="mapping-to">{to}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Missing required */}
              {preview.missing_required.length > 0 && (
                <div className="banner banner-warning">
                  Missing required fields: {preview.missing_required.join(", ")}
                </div>
              )}

              {/* Conflicts from preview */}
              {Array.isArray(preview.conflicts) && preview.conflicts.length > 0 && (
                <div>
                  <div className="section-label" style={{ marginBottom: 8 }}>
                    Conflicts Detected ({preview.conflicts.length})
                  </div>
                  {preview.conflicts.map((c, idx) => {
                    const conflict = c as Record<string, string>;
                    return (
                      <div key={idx} className="conflict-card" style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                          {conflict.product_name ?? "Unknown Product"}
                        </div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
                          Field: {conflict.field}
                        </div>
                        <div className="row-wrap" style={{ gap: 8, fontSize: 12, color: "var(--muted)" }}>
                          <span>Existing: <strong style={{ color: "var(--text)" }}>{conflict.existing_value}</strong></span>
                          <span>Incoming: <strong style={{ color: "var(--yellow)" }}>{conflict.incoming_value}</strong></span>
                        </div>
                        <div className="row-wrap">
                          {(["use_incoming", "use_existing", "keep_both"] as ConflictResolution[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              className={`button button-sm ${conflictResolutions[idx] === r ? "button-success" : "button-ghost"}`}
                              onClick={() => setResolution(idx, r)}
                            >
                              {r.replace(/_/g, " ")}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button className="button" type="button" onClick={() => void onCsvCommit()} disabled={loading}>
                Commit to Database
              </button>
            </div>
          )}
        </article>

        {/* PDF */}
        <article className="card">
          <h3>PDF Indexing</h3>
          <div className="pipeline">
            <span className="pipeline-step">Extract</span>
            <span className="pipeline-arrow">→</span>
            <span className="pipeline-step">Chunk</span>
            <span className="pipeline-arrow">→</span>
            <span className="pipeline-step">Embed</span>
            <span className="pipeline-arrow">→</span>
            <span className="pipeline-step">ChromaDB</span>
          </div>
          <form className="stack" onSubmit={onPdfUpload}>
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={(e) => setPdfFiles(Array.from(e.target.files ?? []))}
            />
            {pdfFiles.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>
                {pdfFiles.length} file(s) selected — {pdfFiles.map((f) => f.name).join(", ")}
              </div>
            )}
            <button className="button" type="submit" disabled={pdfFiles.length === 0 || loading}>
              Index PDF Files
            </button>
          </form>
          <p className="muted" style={{ fontSize: 12 }}>
            PDFs are chunked into 1000-char segments with 200-char overlap, embedded with all-MiniLM-L6-v2,
            and stored in ChromaDB for semantic retrieval.
          </p>
        </article>
      </section>

      <section className="page-grid grid-2">
        <article className="card">
          <h3>Upload History</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Rows</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {files.slice(0, 15).map((f) => (
                  <tr key={f.file_id}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text)" }}>{f.filename}</td>
                    <td><span className="pill">{f.file_type}</span></td>
                    <td>{f.row_count}</td>
                    <td><span className="pill pill-success">{f.status}</span></td>
                  </tr>
                ))}
                {files.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)" }}>No uploads yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h3>Conflict Log</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Field</th>
                  <th>Existing</th>
                  <th>Incoming</th>
                  <th>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.slice(0, 15).map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: "var(--text)" }}>{c.product_name}</td>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{c.field}</td>
                    <td style={{ color: "var(--muted)" }}>{c.existing_value}</td>
                    <td style={{ color: "var(--yellow)" }}>{c.incoming_value}</td>
                    <td>
                      <span className={c.resolution === "pending" ? "pill pill-warning" : "pill pill-success"}>
                        {c.resolution ?? "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
                {conflicts.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>No conflicts recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}