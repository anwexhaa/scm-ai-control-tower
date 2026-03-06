"use client";

import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { AgentResponse } from "@/lib/types";

const exampleQuestions = [
  "Which products are at risk of stockout in the next 14 days?",
  "Which supplier has the best on-time delivery rate?",
  "What is the current stock level of Gadget B?",
  "Which shipments are high risk right now?",
];

export default function DataQueryPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await api.runAgentAction({ action: "ask_document", query });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  const sources = (result?.recommendation as Record<string, unknown> | undefined)
    ?.sources as Array<{ source: string; page: string; text: string }> | undefined;

  return (
    <main className="page-wrap">
      <section className="page-hero">
        <h1>Data Query</h1>
        <p>Ask natural language questions about your live inventory, supplier, and shipment data from PostgreSQL.</p>
      </section>

      <div style={{
        background: "rgba(163,230,53,0.04)",
        border: "1px solid rgba(163,230,53,0.12)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
        fontFamily: "var(--mono)",
        color: "var(--accent)",
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}>
        <span>◈</span>
        <span>
          This page queries live data from PostgreSQL via the AI agent. For PDF document questions, use{" "}
          <a href="/intelligence" style={{ color: "var(--accent)", textDecoration: "underline" }}>Intelligence</a>.
        </span>
      </div>

      {error && <p className="banner banner-danger">{error}</p>}
      {loading && <p className="banner">Querying live supply chain data...</p>}

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
                  className={`chip${query === q ? " chip-active" : ""}`}
                  onClick={() => setQuery(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <form className="stack" onSubmit={onSubmit}>
            <textarea
              rows={5}
              placeholder="Ask about inventory levels, supplier performance, shipment risk..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="button" type="submit" disabled={!query.trim() || loading}>
              Query Data
            </button>
          </form>
        </article>

        <article className="card">
          <h3>Answer</h3>
          {!result && <p className="muted">Submit a question to query your live data.</p>}

          {result && (
            <div className="stack">
              <div className="prose">
                <ReactMarkdown>{result.result ?? ""}</ReactMarkdown>
              </div>

              {result.context && (
                <div style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--muted)",
                  padding: "8px 12px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                }}>
                  {result.context}
                </div>
              )}
            </div>
          )}
        </article>
      </section>

      {sources && sources.length > 0 && (
        <section className="card">
          <h3>Source References ({sources.length})</h3>
          <div className="list">
            {sources.map((s, i) => (
              <div key={i} className="item">
                <div className="row-wrap">
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
                    {s.source || "unknown"}
                  </span>
                  {s.page && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
                      pg. {s.page}
                    </span>
                  )}
                </div>
                {s.text && <p className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>{s.text}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}