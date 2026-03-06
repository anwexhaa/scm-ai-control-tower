// "use client";

// import { FormEvent, useState } from "react";
// import { api } from "@/lib/api";
// import type { RagResponse } from "@/lib/types";

// export default function IntelligencePage() {
//   const [question, setQuestion] = useState("");
//   const [topK, setTopK] = useState(5);
//   const [lastOnly, setLastOnly] = useState(false);
//   const [result, setResult] = useState<RagResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   async function onSubmit(e: FormEvent) {
//     e.preventDefault();
//     if (!question.trim()) return;

//     setLoading(true);
//     setError("");
//     try {
//       const response = await api.queryRag({
//         question,
//         top_k: topK,
//         use_only_last_document: lastOnly,
//       });
//       setResult(response);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "RAG request failed");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <main className="page-wrap">
//       <section className="page-hero">
//         <h1>Knowledge Intelligence</h1>
//         <p>Query indexed documents and augmented inventory context from the same panel.</p>
//       </section>

//       {error ? <p className="banner banner-danger">{error}</p> : null}
//       {loading ? <p className="banner">Generating grounded answer...</p> : null}

//       <section className="page-grid grid-2">
//         <article className="card">
//           <h3>Ask Question</h3>
//           <form className="stack" onSubmit={onSubmit}>
//             <textarea
//               rows={6}
//               placeholder="Ask about shipment delays, stock risk, supplier insights..."
//               value={question}
//               onChange={(e) => setQuestion(e.target.value)}
//             />
//             <div className="row-wrap">
//               <input
//                 className="input"
//                 type="number"
//                 min={1}
//                 max={20}
//                 value={topK}
//                 onChange={(e) => setTopK(Number(e.target.value || 5))}
//               />
//               <label className="muted">
//                 <input
//                   type="checkbox"
//                   checked={lastOnly}
//                   onChange={(e) => setLastOnly(e.target.checked)}
//                   style={{ marginRight: 8 }}
//                 />
//                 Restrict to last document
//               </label>
//             </div>
//             <button className="button" type="submit">Run Query</button>
//           </form>
//         </article>

//         <article className="card">
//           <h3>Answer</h3>
//           {!result ? <p className="muted">Submit a question to view answer and source evidence.</p> : null}
//           {result ? (
//             <div className="stack">
//               <p>{result.answer}</p>
//               <div className="kv"><span>Filtered to Last Document</span><strong>{result.filtered_to_last_document ? "Yes" : "No"}</strong></div>
//               <div className="kv"><span>Source Count</span><strong>{result.sources?.length ?? 0}</strong></div>
//             </div>
//           ) : null}
//         </article>
//       </section>

//       <section className="card">
//         <h3>Source Chunks</h3>
//         {!result?.sources?.length ? <p className="muted">No sources returned yet.</p> : null}
//         <div className="list">
//           {result?.sources?.map((s, idx) => (
//             <div className="item" key={`${s.source}-${idx}`}>
//               <div className="kv"><span>Source</span><strong>{s.source || "unknown"}</strong></div>
//               <div className="kv"><span>Page</span><strong>{String(s.page || "-")}</strong></div>
//               <p className="muted">{s.text}</p>
//             </div>
//           ))}
//         </div>
//       </section>
//     </main>
//   );
// }
"use client";

import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { RagResponse } from "@/lib/types";

const exampleQuestions = [
  "What is the penalty if a supplier's shipment is 4 days late?",
  "What is the minimum on-time delivery rate for carriers?",
  "What happens if a carrier's OTD falls below 85%?",
  "What are the safety stock requirements for Tier 1 components?",
];

export default function IntelligencePage() {
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [lastOnly, setLastOnly] = useState(false);
  const [result, setResult] = useState<RagResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.queryRag({ question, top_k: topK, use_only_last_document: lastOnly });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "RAG request failed");
    } finally {
      setLoading(false);
    }
  }

  const evaluation = result?.evaluation as Record<string, unknown> | null;
  const faithfulness = evaluation?.faithfulness as Record<string, unknown> | null;

  function evalClass(val: number): string {
    if (val >= 50) return "var(--green)";
    if (val >= 25) return "var(--yellow)";
    return "var(--red)";
  }

  return (
    <main className="page-wrap">
      <section className="page-hero">
        <h1>Knowledge Intelligence</h1>
        <p>Ask questions about your uploaded PDF documents — SLAs, contracts, policies, operating procedures.</p>
      </section>

      {error && <p className="banner banner-danger">{error}</p>}
      {loading && <p className="banner">Generating grounded answer from indexed documents...</p>}

      <section className="page-grid grid-2">
        <article className="card">
          <h3>Ask a Question</h3>

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Example Questions</div>
            <div className="chip-row">
              {exampleQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`chip${question === q ? " chip-active" : ""}`}
                  onClick={() => setQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <form className="stack" onSubmit={onSubmit}>
            <textarea
              rows={5}
              placeholder="Ask about shipment SLAs, penalties, stock requirements..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="row-wrap" style={{ alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="section-label">Top-K</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value || 5))}
                  style={{ width: 64 }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={lastOnly}
                  onChange={(e) => setLastOnly(e.target.checked)}
                  style={{ width: "auto" }}
                />
                Last document only
              </label>
            </div>
            <button className="button" type="submit" disabled={!question.trim() || loading}>
              Run Query
            </button>
          </form>
        </article>

        <article className="card">
          <h3>Answer</h3>
          {!result && <p className="muted">Submit a question to see the grounded answer.</p>}

          {result && (
            <div className="stack">
              <div className="prose">
                <ReactMarkdown>{result.answer}</ReactMarkdown>
              </div>

              <div className="kv">
                <span>Filtered to Last Doc</span>
                <strong>{result.filtered_to_last_document ? "Yes" : "No"}</strong>
              </div>
              {result.document_used && (
                <div className="kv">
                  <span>Document Used</span>
                  <strong style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{result.document_used}</strong>
                </div>
              )}

              {/* Eval scores */}
              {evaluation && result.show_evaluation_and_sources !== false && (
                <div>
                  <div className="section-label" style={{ marginBottom: 8 }}>Answer Quality</div>
                  <div className="eval-grid">
                    {["rouge1", "rouge2", "rougeL", "bleu"].map((k) => {
                      const val = Number(evaluation[k] ?? 0);
                      return (
                        <div key={k} className="eval-card">
                          <div className="eval-label">{k.toUpperCase()}</div>
                          <div className="eval-value" style={{ color: evalClass(val) }}>{val}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Faithfulness */}
              {faithfulness && (
                <div style={{
                  background: faithfulness.faithful ? "var(--green-bg)" : "var(--red-bg)",
                  border: `1px solid ${faithfulness.faithful ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                  borderRadius: 6,
                  padding: "10px 14px",
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: faithfulness.faithful ? "var(--green)" : "var(--red)", marginBottom: 4 }}>
                    {faithfulness.faithful ? "✓ Faithful" : "✗ Hallucination Detected"}
                    {faithfulness.faithfulness_percentage != null && (
                      <span style={{ fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>
                        ({String(faithfulness.faithfulness_percentage)}%)
                      </span>
                    )}
                  </div>
                  {Array.isArray(faithfulness.hallucinated_claims) && faithfulness.hallucinated_claims.length > 0 && (
                    <ul style={{ paddingLeft: 16, fontSize: 12, color: "var(--red)", marginTop: 4 }}>
                      {(faithfulness.hallucinated_claims as string[]).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </article>
      </section>

      {/* Source Chunks */}
      {result?.show_evaluation_and_sources !== false && result?.sources && result.sources.length > 0 && (
        <section className="card">
          <h3>Source Chunks ({result.sources.length})</h3>
          <div className="list">
            {result.sources.map((s, idx) => (
              <div className="item" key={`${s.source}-${idx}`}>
                <div className="row-wrap">
                  <div className="kv" style={{ flex: 1 }}>
                    <span>Source</span>
                    <strong style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{s.source || "unknown"}</strong>
                  </div>
                  <div className="kv" style={{ flex: "0 0 auto" }}>
                    <span>Page</span>
                    <strong>{String(s.page || "—")}</strong>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}