"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { AgentResponse, AppHealth, FileRecord, InventoryAnalysis, InventoryItem } from "@/lib/types";
import { statusClass } from "@/lib/ui";

export default function DashboardPage() {
  const [health, setHealth] = useState<AppHealth | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAnalysis[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [assessing, setAssessing] = useState(false);
  const [assessment, setAssessment] = useState<AgentResponse | null>(null);
  const [assessError, setAssessError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [h, inv, a, f] = await Promise.all([
        api.getHealth(),
        api.getInventory(),
        api.getInventoryAlerts(),
        api.listUploadedFiles(),
      ]);
      setHealth(h);
      setInventory(inv);
      setAlerts(a);
      setFiles(f);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    inventory: inventory.length,
    red: alerts.filter((a) => a.status === "Red").length,
    yellow: alerts.filter((a) => a.status === "Yellow").length,
    files: files.length,
  }), [alerts, files.length, inventory.length]);

  async function runFullAssessment() {
    setAssessing(true);
    setAssessError("");
    setAssessment(null);
    try {
      const r = await api.runAgentAction({ action: "full_assessment" });
      setAssessment(r);
    } catch (err) {
      setAssessError(err instanceof Error ? err.message : "Assessment failed");
    } finally {
      setAssessing(false);
    }
  }

  const kpis = assessment?.kpis as Record<string, number> | undefined;

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
      <section className="page-hero row">
        <div>
          <h1>Operations Dashboard</h1>
          <p>System overview, active risk signals, and data freshness.</p>
        </div>
        <div className="row-wrap">
          <button className="button button-ghost" type="button" onClick={() => void load()} disabled={loading}>
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
          <button className="button" type="button" onClick={() => void runFullAssessment()} disabled={assessing}>
            {assessing ? "Running..." : "⚡ Full Assessment"}
          </button>
        </div>
      </section>

      {error && <p className="banner banner-danger">{error}</p>}
      {loading && <p className="banner">Loading latest metrics...</p>}
      {assessError && <p className="banner banner-danger">{assessError}</p>}
      {assessing && <p className="banner">Running full assessment across all agents...</p>}

      <section className="page-grid grid-4">
        <article className="card stat">
          <h2>Inventory Records</h2>
          <p>{stats.inventory}</p>
        </article>
        <article className="card stat card-border-red">
          <h2>Red Alerts</h2>
          <p style={{ color: stats.red > 0 ? "var(--red)" : "var(--text)" }}>{stats.red}</p>
        </article>
        <article className="card stat card-border-yellow">
          <h2>Yellow Alerts</h2>
          <p style={{ color: stats.yellow > 0 ? "var(--yellow)" : "var(--text)" }}>{stats.yellow}</p>
        </article>
        <article className="card stat">
          <h2>Total Uploads</h2>
          <p>{stats.files}</p>
        </article>
      </section>

      {assessment && (
        <section className="card" style={{ gap: 18 }}>
          <div className="row">
            <h3>Full Assessment Result</h3>
            <span className="pill pill-accent">⚡ Live</span>
          </div>
          <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>{assessment.result}</p>

          {kpis && (
            <div className="kpi-grid">
              {Object.entries(kpis).map(([k, v]) => (
                <div key={k} className={`kpi-card ${kpiClass(k, v as number)}`}>
                  <div className="kpi-card-label">{k.replace(/_/g, " ")}</div>
                  <div className="kpi-card-value">
                    {typeof v === "number" && k.includes("rate") || k.includes("health") || k.includes("score")
                      ? `${v}%`
                      : String(v)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {assessment.reasoning && (
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Executive Summary</div>
              <div className="prose">
                <ReactMarkdown>{assessment.reasoning}</ReactMarkdown>
              </div>
            </div>
          )}

          {assessment.context && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              {assessment.context}
            </div>
          )}
        </section>
      )}

      <section className="page-grid grid-2">
        <article className="card">
          <h3>System Health</h3>
          <div className="kv"><span>Status</span><strong>{health?.status ?? "—"}</strong></div>
          <div className="kv"><span>Service</span><strong>{health?.system ?? "—"}</strong></div>
          <div className="kv">
            <span>Database</span>
            <span className={health?.db_configured ? "pill pill-success" : "pill pill-danger"}>
              {health?.db_configured ? "Configured" : "Missing"}
            </span>
          </div>
          <div className="kv">
            <span>LLM Key</span>
            <span className={health?.api_key_configured ? "pill pill-success" : "pill pill-danger"}>
              {health?.api_key_configured ? "Configured" : "Missing"}
            </span>
          </div>
          {health?.agents_active && (
            <div className="kv">
              <span>Active Agents</span>
              <strong>{health.agents_active.join(", ")}</strong>
            </div>
          )}
        </article>

        <article className="card">
          <h3>Critical Inventory Alerts</h3>
          {alerts.length === 0 && <p className="muted">No alerting items.</p>}
          <div className="list">
            {alerts.slice(0, 8).map((a) => (
              <div className="item row" key={`${a.product_id}-${a.status}`}>
                <span style={{ fontSize: 13, color: "var(--text)" }}>{a.product_name}</span>
                <span className={statusClass(a.status)}>{a.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card">
        <h3>Recent Uploads</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Type</th>
                <th>Rows</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {files.slice(0, 10).map((f) => (
                <tr key={f.file_id}>
                  <td style={{ color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12 }}>{f.filename}</td>
                  <td><span className="pill">{f.file_type}</span></td>
                  <td>{f.row_count}</td>
                  <td><span className="pill pill-success">{f.status}</span></td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
                    {f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>No uploads yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}