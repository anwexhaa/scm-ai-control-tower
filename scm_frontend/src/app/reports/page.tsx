"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { AgentResponse } from "@/lib/types";

type KPIs = {
  inventory_health: number;
  shipment_on_time_rate: number;
  supplier_health_score: number;
  critical_alerts_count: number;
  items_below_reorder: number;
  projected_stockouts_14d: number;
};

const kpiConfig: { key: keyof KPIs; label: string; threshold: number; unit: string; zeroOk?: boolean }[] = [
  { key: "inventory_health",      label: "Inventory Health",       threshold: 90,  unit: "%" },
  { key: "shipment_on_time_rate", label: "Shipment On-Time Rate",  threshold: 85,  unit: "%" },
  { key: "supplier_health_score", label: "Supplier Health Score",  threshold: 75,  unit: "%" },
  { key: "critical_alerts_count", label: "Critical Alerts",        threshold: 0,   unit: "",  zeroOk: true },
  { key: "items_below_reorder",   label: "Below Reorder",          threshold: 0,   unit: "",  zeroOk: true },
  { key: "projected_stockouts_14d", label: "Stockouts (14d)",      threshold: 0,   unit: "",  zeroOk: true },
];

export default function ReportsPage() {
  const [report, setReport] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const r = await api.runAgentAction({ action: "generate_report" });
      setReport(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setLoading(false);
    }
  }

  const kpis = report?.kpis as KPIs | undefined;
  const recommendations = Array.isArray(report?.recommendation) ? (report?.recommendation as string[]) : [];
  const rootCauses = report?.root_causes ?? [];
  const projections = report?.forward_projections ?? [];

  function kpiStatus(cfg: typeof kpiConfig[0], val: number): "kpi-ok" | "kpi-warn" | "kpi-bad" {
    if (cfg.zeroOk) return val === 0 ? "kpi-ok" : "kpi-bad";
    return val >= cfg.threshold ? "kpi-ok" : val >= cfg.threshold * 0.8 ? "kpi-warn" : "kpi-bad";
  }

  return (
    <main className="page-wrap">
      <section className="page-hero row">
        <div>
          <h1>Executive Reports</h1>
          <p>AI-generated KPI report across inventory, suppliers, and shipments.</p>
        </div>
        <div className="row-wrap">
          <button className="button" type="button" onClick={() => void generate()} disabled={loading}>
            {loading ? "Generating..." : "⚡ Generate Report"}
          </button>
          <a className="button button-ghost" href={api.reportPdfUrl} target="_blank" rel="noreferrer">
            ↓ Download PDF
          </a>
        </div>
      </section>

      {error && <p className="banner banner-danger">{error}</p>}
      {loading && <p className="banner">Generating executive report — analyzing all data sources...</p>}

      {!report && !loading && (
        <div className="card" style={{ alignItems: "center", padding: "60px 24px", gap: 12 }}>
          <p style={{ fontSize: 24, opacity: 0.1 }}>≡</p>
          <p className="muted">Click Generate Report to build the latest executive KPI summary.</p>
        </div>
      )}

      {report && kpis && (
        <>
          {/* KPI Cards */}
          <section>
            <div className="section-label" style={{ marginBottom: 10 }}>Key Performance Indicators</div>
            <div className="page-grid grid-3">
              {kpiConfig.map((cfg) => {
                const val = kpis[cfg.key] ?? 0;
                const cls = kpiStatus(cfg, val);
                return (
                  <article key={cfg.key} className={`card kpi-card ${cls}`} style={{ gap: 6 }}>
                    <div className="kpi-card-label">{cfg.label}</div>
                    <div className="kpi-card-value">{val}{cfg.unit}</div>
                    {!cfg.zeroOk && (
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
                        Target: ≥{cfg.threshold}{cfg.unit}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {/* Executive Summary */}
          {report.reasoning && (
            <article className="card">
              <h3>Executive Summary</h3>
              <div className="prose">
                <ReactMarkdown>{report.reasoning}</ReactMarkdown>
              </div>
            </article>
          )}

          {/* Recommendations + Root Causes */}
          <section className="page-grid grid-2">
            <article className="card">
              <h3>Recommendations</h3>
              <div className="list">
                {recommendations.map((r, i) => (
                  <div key={i} className="item">
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--accent)", fontWeight: 700, marginTop: 2 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>{r}</p>
                    </div>
                  </div>
                ))}
                {recommendations.length === 0 && <p className="muted">No recommendations.</p>}
              </div>
            </article>

            <article className="card">
              <h3>Root Cause Analysis</h3>
              <div className="list">
                {rootCauses.map((c, i) => (
                  <div key={i} className="item" style={{ fontSize: 12, color: "var(--muted)" }}>
                    {c}
                  </div>
                ))}
                {rootCauses.length === 0 && <p className="muted">No root causes identified.</p>}
              </div>
            </article>
          </section>

          {/* Stockout Risk Table */}
          {projections.length > 0 && (
            <article className="card">
              <h3>14-Day Stockout Risk</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.map((p, i) => (
                      <tr key={i}>
                        <td style={{ color: "var(--text)" }}>{p}</td>
                        <td>
                          <span className="pill pill-danger">⚠ At Risk</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {/* Context */}
          {report.context && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
              {report.context}
            </div>
          )}
        </>
      )}
    </main>
  );
}