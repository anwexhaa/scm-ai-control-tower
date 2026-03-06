// "use client";

// import { FormEvent, useState } from "react";
// import { api } from "@/lib/api";
// import type { AgentAction, AgentRequest, AgentResponse } from "@/lib/types";

// type ActionMeta = {
//   label: string;
//   description: string;
//   inputs: ("product_id" | "shipment_id" | "query" | "quantity" | "urgency")[];
// };

// const ACTION_META: Record<AgentAction, ActionMeta> = {
//   analyze_inventory: {
//     label: "Analyze Inventory",
//     description: "EOQ, safety stock, days until stockout, and reorder recommendation for a specific product.",
//     inputs: ["product_id"],
//   },
//   select_supplier: {
//     label: "Select Supplier",
//     description: "Score and rank all suppliers from the database using dynamic weight adjustment based on urgency and quantity.",
//     inputs: ["quantity", "urgency"],
//   },
//   track_shipment: {
//     label: "Track Shipment",
//     description: "Predict delay risk, detect carrier anomalies, and check cascade impact on inventory.",
//     inputs: ["shipment_id", "urgency"],
//   },
//   generate_report: {
//     label: "Generate Report",
//     description: "Compute all KPIs, detect root causes, project 14-day stockouts, and write an executive summary.",
//     inputs: [],
//   },
//   ask_document: {
//     label: "Ask Document",
//     description: "Query indexed PDFs using RAG — SLAs, contracts, operating procedures.",
//     inputs: ["query"],
//   },
//   full_assessment: {
//     label: "Full Assessment",
//     description: "Runs all agents in sequence. Cross-agent intelligence: inventory → supplier → shipment cascade → report KPIs.",
//     inputs: [],
//   },
// };

// const ACTIONS = Object.keys(ACTION_META) as AgentAction[];

// export default function AgentsPage() {
//   const [action, setAction] = useState<AgentAction>("full_assessment");
//   const [productId, setProductId] = useState("");
//   const [shipmentId, setShipmentId] = useState("");
//   const [query, setQuery] = useState("");
//   const [quantity, setQuantity] = useState(100);
//   const [urgency, setUrgency] = useState("normal");
//   const [result, setResult] = useState<AgentResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   async function onSubmit(e: FormEvent) {
//     e.preventDefault();
//     setLoading(true);
//     setError("");
//     const payload: AgentRequest = { action, quantity, urgency };
//     if (action === "analyze_inventory") payload.product_id = productId;
//     if (action === "track_shipment") payload.shipment_id = shipmentId;
//     if (action === "ask_document") payload.query = query;
//     try {
//       const response = await api.runAgentAction(payload);
//       setResult(response);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Agent request failed");
//     } finally {
//       setLoading(false);
//     }
//   }

//   const meta = ACTION_META[action];
//   const kpis = result?.kpis as Record<string, number> | undefined;

//   return (
//     <main style={s.page}>
//       <section style={s.hero}>
//         <div>
//           <p style={s.eyebrow}>MULTI-AGENT ORCHESTRATION</p>
//           <h1 style={s.title}>Agents</h1>
//           <p style={s.sub}>Cross-functional intelligence across inventory, suppliers, shipments, and documents.</p>
//         </div>
//         <a href={api.reportPdfUrl} target="_blank" rel="noreferrer" style={s.pdfBtn}>
//           ↓ Download Report PDF
//         </a>
//       </section>

//       {error && <div style={s.bannerDanger}>{error}</div>}

//       <section style={s.layout}>
//         {/* Left — controls */}
//         <article style={s.controlPanel}>
//           <p style={s.sectionLabel}>SELECT ACTION</p>
//           <div style={s.actionGrid}>
//             {ACTIONS.map((a) => (
//               <button key={a}
//                 style={{ ...s.actionBtn, ...(action === a ? s.actionBtnActive : {}) }}
//                 onClick={() => { setAction(a); setResult(null); }}>
//                 <span style={s.actionBtnLabel}>{ACTION_META[a].label}</span>
//               </button>
//             ))}
//           </div>

//           <div style={s.actionDesc}>
//             <p style={s.sectionLabel}>{meta.label.toUpperCase()}</p>
//             <p style={s.descText}>{meta.description}</p>
//           </div>

//           <form style={s.stack} onSubmit={onSubmit}>
//             {meta.inputs.includes("product_id") && (
//               <div>
//                 <label style={s.inputLabel}>Product ID</label>
//                 <input style={s.input} placeholder="e.g. P001"
//                   value={productId} onChange={(e) => setProductId(e.target.value)} />
//               </div>
//             )}
//             {meta.inputs.includes("shipment_id") && (
//               <div>
//                 <label style={s.inputLabel}>Shipment ID</label>
//                 <input style={s.input} placeholder="e.g. SHP-001"
//                   value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} />
//               </div>
//             )}
//             {meta.inputs.includes("query") && (
//               <div>
//                 <label style={s.inputLabel}>Question</label>
//                 <textarea style={s.textarea} rows={4}
//                   placeholder="Ask about SLA penalties, shipment policy, supplier terms..."
//                   value={query} onChange={(e) => setQuery(e.target.value)} />
//               </div>
//             )}
//             {meta.inputs.includes("quantity") && (
//               <div>
//                 <label style={s.inputLabel}>Order Quantity</label>
//                 <input style={s.input} type="number" min={1} value={quantity}
//                   onChange={(e) => setQuantity(Number(e.target.value || 100))} />
//               </div>
//             )}
//             {meta.inputs.includes("urgency") && (
//               <div>
//                 <label style={s.inputLabel}>Urgency</label>
//                 <select style={s.select} value={urgency} onChange={(e) => setUrgency(e.target.value)}>
//                   <option value="normal">Normal</option>
//                   <option value="urgent">Urgent</option>
//                   <option value="immediate">Immediate</option>
//                 </select>
//               </div>
//             )}
//             <button style={{ ...s.btnPrimary, marginTop: "0.5rem" }} type="submit" disabled={loading}>
//               {loading ? "Running..." : `Run — ${meta.label}`}
//             </button>
//           </form>
//         </article>

//         {/* Right — results */}
//         <article style={s.resultPanel}>
//           <p style={s.sectionLabel}>RESULT</p>

//           {!result && !loading && (
//             <div style={s.emptyState}>
//               <p style={s.emptyTitle}>Select an action and execute</p>
//               <p style={s.emptyDesc}>Results will appear here with structured output from the agent pipeline.</p>
//             </div>
//           )}

//           {loading && (
//             <div style={s.emptyState}>
//               <p style={s.emptyTitle}>Agent pipeline running...</p>
//             </div>
//           )}

//           {result && (
//             <div style={s.stack}>
//               {/* Result summary */}
//               {result.result && (
//                 <div style={s.resultHeader}>
//                   <span style={s.resultTitle}>{result.result}</span>
//                 </div>
//               )}

//               {/* KPIs */}
//               {kpis && (
//                 <div>
//                   <p style={s.subLabel}>KPIs</p>
//                   <div style={s.kpiGrid}>
//                     {Object.entries(kpis).map(([k, v]) => (
//                       <div key={k} style={s.kpiCard}>
//                         <p style={s.kpiLabel}>{k.replace(/_/g, " ")}</p>
//                         <p style={s.kpiValue}>{typeof v === "number" && v % 1 !== 0 ? v.toFixed(1) : v}{k.includes("rate") || k.includes("health") || k.includes("score") ? "%" : ""}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Executive summary / reasoning */}
//               {result.reasoning && (
//                 <div style={s.summaryBox}>
//                   <p style={s.subLabel}>EXECUTIVE SUMMARY</p>
//                   <p style={s.summaryText}>{result.reasoning}</p>
//                 </div>
//               )}

//               {/* Cascade risk */}
//               {result.cascade_risk && (
//                 <div style={s.cascadeBox}>
//                   <p style={s.subLabel}>CASCADE RISK</p>
//                   <p style={s.cascadeText}>{result.cascade_risk}</p>
//                 </div>
//               )}

//               {/* Carrier flag */}
//               {result.carrier_flag && (
//                 <div style={s.warningBox}>
//                   <p style={s.subLabel}>CARRIER ANOMALY</p>
//                   <p style={s.warningText}>{result.carrier_flag}</p>
//                 </div>
//               )}

//               {/* Root causes */}
//               {result.root_causes && result.root_causes.length > 0 && (
//                 <div>
//                   <p style={s.subLabel}>ROOT CAUSES</p>
//                   {result.root_causes.map((c, i) => (
//                     <div key={i} style={s.causeRow}>
//                       <span style={s.causeDot}>▸</span>
//                       <span style={s.causeText}>{c}</span>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* Forward projections */}
//               {result.forward_projections && result.forward_projections.length > 0 && (
//                 <div>
//                   <p style={s.subLabel}>14-DAY STOCKOUT RISK</p>
//                   <div style={s.projGrid}>
//                     {result.forward_projections.map((p, i) => (
//                       <div key={i} style={s.projItem}>
//                         <span style={s.projDot}>⚠</span>
//                         <span style={s.projText}>{p}</span>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Context */}
//               {result.context && (
//                 <p style={s.contextText}>{result.context}</p>
//               )}

//               {/* Raw JSON toggle */}
//               <details style={s.details}>
//                 <summary style={s.detailsSummary}>View raw JSON</summary>
//                 <pre style={s.pre}>{JSON.stringify(result, null, 2)}</pre>
//               </details>
//             </div>
//           )}
//         </article>
//       </section>
//     </main>
//   );
// }

// const s: Record<string, React.CSSProperties> = {
//   page: { padding: "2rem", maxWidth: 1300, margin: "0 auto", fontFamily: "var(--font-sans)" },
//   hero: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" },
//   eyebrow: { fontSize: 11, letterSpacing: "0.15em", color: "#444", marginBottom: 6, fontFamily: "var(--font-mono)" },
//   title: { fontSize: "2rem", fontWeight: 700, color: "#f5f5f5", margin: 0 },
//   sub: { color: "#666", marginTop: 6, fontSize: 14 },
//   pdfBtn: { background: "transparent", color: "#a3a3a3", border: "1px solid #2a2a2a", padding: "0.6rem 1.25rem", borderRadius: 4, fontSize: 13, textDecoration: "none", fontFamily: "var(--font-sans)", display: "inline-block" },
//   bannerDanger: { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", padding: "0.75rem 1rem", borderRadius: 4, marginBottom: "1.5rem", fontSize: 13 },
//   layout: { display: "grid", gridTemplateColumns: "340px 1fr", gap: "1.5rem", alignItems: "start" },
//   controlPanel: { background: "#0d0d0d", border: "1px solid #1f1f1f", borderRadius: 6, padding: "1.5rem" },
//   resultPanel: { background: "#0d0d0d", border: "1px solid #1f1f1f", borderRadius: 6, padding: "1.5rem", minHeight: 400 },
//   sectionLabel: { fontSize: 11, color: "#444", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem", fontFamily: "var(--font-mono)" },
//   subLabel: { fontSize: 10, color: "#444", letterSpacing: "0.12em", textTransform: "uppercase", margin: "1rem 0 0.5rem", fontFamily: "var(--font-mono)" },
//   actionGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginBottom: "1.25rem" },
//   actionBtn: { background: "#111", border: "1px solid #222", borderRadius: 4, padding: "0.5rem 0.5rem", cursor: "pointer", textAlign: "left" },
//   actionBtnActive: { background: "#1a1a1a", border: "1px solid #444" },
//   actionBtnLabel: { fontSize: 11, color: "#888", fontFamily: "var(--font-mono)" },
//   actionDesc: { background: "#111", border: "1px solid #1a1a1a", borderRadius: 4, padding: "0.75rem", marginBottom: "1.25rem" },
//   descText: { color: "#666", fontSize: 12, lineHeight: 1.6 },
//   stack: { display: "flex", flexDirection: "column", gap: "0.75rem" },
//   inputLabel: { display: "block", fontSize: 10, color: "#444", letterSpacing: "0.1em", marginBottom: 4, fontFamily: "var(--font-mono)" },
//   input: { background: "#111", border: "1px solid #2a2a2a", color: "#d4d4d4", padding: "0.55rem 0.75rem", borderRadius: 4, fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "var(--font-sans)" },
//   textarea: { background: "#111", border: "1px solid #2a2a2a", color: "#d4d4d4", padding: "0.55rem 0.75rem", borderRadius: 4, fontSize: 13, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "var(--font-sans)" },
//   select: { background: "#111", border: "1px solid #2a2a2a", color: "#d4d4d4", padding: "0.55rem 0.75rem", borderRadius: 4, fontSize: 13, width: "100%", fontFamily: "var(--font-sans)" },
//   btnPrimary: { background: "#f5f5f5", color: "#0a0a0a", border: "none", padding: "0.65rem 1.25rem", borderRadius: 4, fontWeight: 600, cursor: "pointer", fontSize: 13 },
//   emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, textAlign: "center" },
//   emptyTitle: { color: "#444", fontSize: 14, fontWeight: 500 },
//   emptyDesc: { color: "#333", fontSize: 12, marginTop: 8 },
//   resultHeader: { background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, padding: "0.75rem 1rem" },
//   resultTitle: { color: "#f5f5f5", fontSize: 14, fontWeight: 600 },
//   kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.5rem" },
//   kpiCard: { background: "#111", padding: "0.75rem", borderRadius: 4, border: "1px solid #1a1a1a" },
//   kpiLabel: { fontSize: 10, color: "#555", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 4 },
//   kpiValue: { fontSize: "1.25rem", fontWeight: 700, color: "#d4d4d4" },
//   summaryBox: { background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 4, padding: "1rem" },
//   summaryText: { color: "#a3a3a3", fontSize: 13, lineHeight: 1.7 },
//   cascadeBox: { background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 4, padding: "0.75rem 1rem" },
//   cascadeText: { color: "#ef4444", fontSize: 13, lineHeight: 1.6 },
//   warningBox: { background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 4, padding: "0.75rem 1rem" },
//   warningText: { color: "#eab308", fontSize: 13, lineHeight: 1.6 },
//   causeRow: { display: "flex", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid #141414" },
//   causeDot: { color: "#444", fontSize: 11, marginTop: 2 },
//   causeText: { color: "#888", fontSize: 12, lineHeight: 1.5 },
//   projGrid: { display: "flex", flexDirection: "column", gap: 4 },
//   projItem: { display: "flex", gap: "0.5rem", alignItems: "center", background: "rgba(239,68,68,0.04)", padding: "0.4rem 0.5rem", borderRadius: 3 },
//   projDot: { color: "#ef4444", fontSize: 11 },
//   projText: { color: "#a3a3a3", fontSize: 12, fontFamily: "var(--font-mono)" },
//   contextText: { color: "#444", fontSize: 11, fontFamily: "var(--font-mono)", borderTop: "1px solid #1a1a1a", paddingTop: "0.75rem", marginTop: "0.5rem" },
//   details: { borderTop: "1px solid #1a1a1a", paddingTop: "0.75rem", marginTop: "0.5rem" },
//   detailsSummary: { color: "#444", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-mono)" },
//   pre: { background: "#080808", border: "1px solid #1a1a1a", borderRadius: 4, padding: "1rem", overflowX: "auto", fontSize: 11, color: "#666", fontFamily: "var(--font-mono)", marginTop: "0.75rem" },
// };
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