"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { AgentAction, AgentResponse } from "@/lib/types";

type ActionMeta = {
  label: string;
  description: string;
  inputs: ("product_id" | "shipment_id" | "query" | "quantity" | "urgency")[];
};

const actionMeta: Record<AgentAction, ActionMeta> = {
  analyze_inventory: {
    label: "Analyze Inventory",
    description: "Deep SKU analysis — EOQ, safety stock, reorder point, days until stockout.",
    inputs: ["product_id"],
  },
  select_supplier: {
    label: "Select Supplier",
    description: "Score and rank all suppliers using dynamic weighting by urgency and quantity.",
    inputs: ["quantity", "urgency"],
  },
  track_shipment: {
    label: "Track Shipment",
    description: "Predict delay, assess cascade risk, and detect carrier anomalies.",
    inputs: ["shipment_id", "urgency"],
  },
  generate_report: {
    label: "Generate Report",
    description: "Full executive KPI report with AI-generated summary and recommendations.",
    inputs: [],
  },
  ask_document: {
    label: "Ask Document",
    description: "Ask a natural language question answered from indexed PDF documents.",
    inputs: ["query"],
  },
  full_assessment: {
    label: "Full Assessment",
    description: "Cross-agent run: inventory → suppliers → shipments → KPI report.",
    inputs: [],
  },
};

const actions = Object.keys(actionMeta) as AgentAction[];

export default function AgentsPage() {
  const [action, setAction] = useState<AgentAction>("full_assessment");
  const [productId, setProductId] = useState("");
  const [shipmentId, setShipmentId] = useState("");
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [urgency, setUrgency] = useState("normal");
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  async function run() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        action,
        quantity,
        urgency,
        ...(action === "analyze_inventory" ? { product_id: productId } : {}),
        ...(action === "track_shipment" ? { shipment_id: shipmentId } : {}),
        ...(action === "ask_document" ? { query } : {}),
      };
      const r = await api.runAgentAction(payload);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent request failed");
    } finally {
      setLoading(false);
    }
  }

  const meta = actionMeta[action];
  const kpis = result?.kpis as Record<string, number> | undefined;

  function kpiClass(key: string, val: number): string {
    const thresholds: Record<string, number> = {
      inventory_health: 90,
      shipment_on_time_rate: 85,
      supplier_health_score: 75,
    };
    const zeroOk = ["critical_alerts_count", "items_below_reorder", "projected_stockouts_14d"];
    if (zeroOk.includes(key)) return val === 0 ? "kpi-ok" : "kpi-bad";
    const t = thresholds[key];
    if (!t) return "kpi-ok";
    return val >= t ? "kpi-ok" : val >= t * 0.8 ? "kpi-warn" : "kpi-bad";
  }

  return (
    <main className="page-wrap">
      <section className="page-hero">
        <h1>Multi-Agent Orchestration</h1>
        <p>Execute cross-functional actions across inventory, supplier, shipment, and reporting agents.</p>
      </section>

      {error && <p className="banner banner-danger">{error}</p>}
      {loading && <p className="banner">Executing agent workflow...</p>}

      <section className="page-grid grid-2">
        {/* LEFT — Controls */}
        <article className="card">
          <h3>Select Action</h3>
          <div className="action-grid">
            {actions.map((a) => (
              <button
                key={a}
                type="button"
                className={`action-btn${action === a ? " action-btn-active" : ""}`}
                onClick={() => setAction(a)}
              >
                {actionMeta[a].label}
              </button>
            ))}
          </div>

          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 12px" }}>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>{meta.description}</p>
          </div>

          <div className="stack">
            {meta.inputs.includes("product_id") && (
              <input
                placeholder="Product ID (e.g. SKU-101)"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              />
            )}
            {meta.inputs.includes("shipment_id") && (
              <input
                placeholder="Shipment ID"
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
              />
            )}
            {meta.inputs.includes("query") && (
              <textarea
                rows={3}
                placeholder="Enter your question..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            )}
            {meta.inputs.includes("quantity") && (
              <div className="row-wrap">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value || 100))}
                  placeholder="Quantity"
                  style={{ flex: 1 }}
                />
              </div>
            )}
            {meta.inputs.includes("urgency") && (
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="immediate">Immediate</option>
              </select>
            )}

            <button className="button" type="button" onClick={() => void run()} disabled={loading}>
              {loading ? "Running..." : `▶ Run ${meta.label}`}
            </button>
            <a className="button button-ghost" href={api.reportPdfUrl} target="_blank" rel="noreferrer">
              ↓ Download Report PDF
            </a>
          </div>
        </article>

        {/* RIGHT — Result */}
        <article className="card">
          <h3>Result</h3>
          {!result && <p className="muted">Run an action to see the structured output.</p>}

          {result && (
            <div className="stack">
              {/* Header result */}
              {result.result && (
                <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>{result.result}</p>
              )}

              {/* KPIs */}
              {kpis && (
                <div>
                  <div className="section-label" style={{ marginBottom: 8 }}>KPI Overview</div>
                  <div className="kpi-grid">
                    {Object.entries(kpis).map(([k, v]) => (
                      <div key={k} className={`kpi-card ${kpiClass(k, v as number)}`}>
                        <div className="kpi-card-label">{k.replace(/_/g, " ")}</div>
                        <div className="kpi-card-value">
                          {k.includes("rate") || k.includes("health") || k.includes("score")
                            ? `${v}%`
                            : String(v)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cascade risk */}
              {result.cascade_risk && (
                <div style={{
                  background: "var(--red-bg)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--red)",
                }}>
                  {result.cascade_risk}
                </div>
              )}

              {/* Carrier flag */}
              {result.carrier_flag && (
                <div style={{
                  background: "var(--yellow-bg)",
                  border: "1px solid rgba(234,179,8,0.2)",
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--yellow)",
                }}>
                  {result.carrier_flag}
                </div>
              )}

              {/* Reasoning */}
              {result.reasoning && (
                <div>
                  <div className="section-label" style={{ marginBottom: 6 }}>
                    {action === "generate_report" || action === "full_assessment" ? "Executive Summary" : "Reasoning"}
                  </div>
                  <div className="prose">
                    <ReactMarkdown>{result.reasoning}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Root causes */}
              {result.root_causes && result.root_causes.length > 0 && (
                <div>
                  <div className="section-label" style={{ marginBottom: 6 }}>Root Causes</div>
                  <div className="list">
                    {result.root_causes.map((c, i) => (
                      <div key={i} className="item" style={{ fontSize: 12, color: "var(--muted)" }}>
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forward projections */}
              {result.forward_projections && result.forward_projections.length > 0 && (
                <div>
                  <div className="section-label" style={{ marginBottom: 6 }}>14-Day Stockout Risk</div>
                  <div className="list">
                    {result.forward_projections.map((p, i) => (
                      <div key={i} className="item" style={{
                        background: "var(--red-bg)",
                        borderColor: "rgba(239,68,68,0.15)",
                        color: "var(--red)",
                        fontSize: 12,
                      }}>
                        ⚠ {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Context */}
              {result.context && (
                <div style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--muted)",
                  padding: "8px 0",
                  borderTop: "1px solid var(--border)",
                }}>
                  {result.context}
                </div>
              )}

              {/* Raw JSON */}
              <details>
                <summary>View Raw JSON</summary>
                <div className="inner">
                  <pre className="code">{JSON.stringify(result, null, 2)}</pre>
                </div>
              </details>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}