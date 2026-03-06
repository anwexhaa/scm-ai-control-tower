// "use client";

// import { useCallback, useEffect, useState } from "react";
// import { api } from "@/lib/api";
// import type { InventoryAnalysis, InventoryItem } from "@/lib/types";
// import { statusClass } from "@/lib/ui";

// export default function InventoryPage() {
//   const [items, setItems] = useState<InventoryItem[]>([]);
//   const [selectedProduct, setSelectedProduct] = useState("");
//   const [analysis, setAnalysis] = useState<InventoryAnalysis | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const loadInventory = useCallback(async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const list = await api.getInventory();
//       setItems(list);
//       if (!selectedProduct && list.length > 0) setSelectedProduct(list[0].product_id);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load inventory");
//     } finally {
//       setLoading(false);
//     }
//   }, [selectedProduct]);

//   useEffect(() => {
//     void loadInventory();
//   }, [loadInventory]);

//   async function runAnalysis() {
//     if (!selectedProduct) return;
//     setLoading(true);
//     setError("");
//     try {
//       const result = await api.analyzeInventoryItem(selectedProduct);
//       setAnalysis(result);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Analysis failed");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <main className="page-wrap">
//       <section className="page-hero">
//         <h1>Inventory Intelligence</h1>
//         <p>Analyze stock health, reorder posture, and exposure by SKU.</p>
//       </section>

//       {error ? <p className="banner banner-danger">{error}</p> : null}
//       {loading ? <p className="banner">Processing...</p> : null}

//       <section className="page-grid grid-2">
//         <article className="card">
//           <h3>Run Product Analysis</h3>
//           <div className="stack">
//             <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
//               <option value="">Select product</option>
//               {items.map((i) => (
//                 <option value={i.product_id} key={i.product_id}>
//                   {i.product_id} - {i.product_name}
//                 </option>
//               ))}
//             </select>
//             <div className="row-wrap">
//               <button className="button" type="button" onClick={() => void runAnalysis()}>
//                 Analyze SKU
//               </button>
//               <button className="button button-ghost" type="button" onClick={() => void loadInventory()}>
//                 Reload Inventory
//               </button>
//             </div>
//           </div>

//           {analysis ? (
//             <div className="stack" style={{ marginTop: 12 }}>
//               <div className="row">
//                 <strong>{analysis.product_name}</strong>
//                 <span className={statusClass(analysis.status)}>{analysis.status}</span>
//               </div>
//               <div className="kv"><span>Days Until Stockout</span><strong>{analysis.days_until_stockout}</strong></div>
//               <div className="kv"><span>EOQ</span><strong>{analysis.eoq}</strong></div>
//               <div className="kv"><span>Safety Stock</span><strong>{analysis.safety_stock}</strong></div>
//               <div className="kv"><span>Estimated Order Cost</span><strong>${analysis.estimated_cost}</strong></div>
//               <p className="muted">{analysis.recommended_action}</p>
//               <p className="muted">{analysis.reasoning}</p>
//             </div>
//           ) : null}
//         </article>

//         <article className="card">
//           <h3>Inventory Snapshot</h3>
//           <div className="table-wrap">
//             <table>
//               <thead>
//                 <tr>
//                   <th>Product</th>
//                   <th>Stock</th>
//                   <th>Threshold</th>
//                   <th>Warehouse</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {items.map((i) => (
//                   <tr key={i.product_id}>
//                     <td>{i.product_name}</td>
//                     <td>{i.quantity_in_stock}</td>
//                     <td>{i.reorder_threshold}</td>
//                     <td>{i.warehouse ?? "-"}</td>
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

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { InventoryAnalysis, InventoryItem } from "@/lib/types";
import { statusClass, stockColorClass } from "@/lib/ui";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAnalysis[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [analysis, setAnalysis] = useState<InventoryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, a] = await Promise.all([api.getInventory(), api.getInventoryAlerts()]);
      setItems(list);
      setAlerts(a);
      if (!selectedProduct && list.length > 0) setSelectedProduct(list[0].product_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [selectedProduct]);

  useEffect(() => { void loadInventory(); }, [loadInventory]);

  async function runAnalysis(productId?: string) {
    const id = productId ?? selectedProduct;
    if (!id) return;
    setAnalyzing(true);
    setError("");
    if (productId) setSelectedProduct(productId);
    try {
      const result = await api.analyzeInventoryItem(id);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  const filtered = items.filter(
    (i) =>
      i.product_name.toLowerCase().includes(search.toLowerCase()) ||
      i.product_id.toLowerCase().includes(search.toLowerCase())
  );

  function completenessClass(s: string) {
    if (s === "full") return "pill pill-success";
    if (s.includes("partial")) return "pill pill-warning";
    return "pill pill-danger";
  }

  return (
    <main className="page-wrap">
      <section className="page-hero">
        <h1>Inventory Intelligence</h1>
        <p>Analyze stock health, reorder posture, and exposure by SKU.</p>
      </section>

      {error && <p className="banner banner-danger">{error}</p>}
      {(loading || analyzing) && <p className="banner">{analyzing ? "Running analysis..." : "Loading inventory..."}</p>}

      {/* Alert chips */}
      {alerts.length > 0 && (
        <div className="card" style={{ gap: 10 }}>
          <div className="section-label">Active Alerts — click to analyze</div>
          <div className="alert-chips">
            {alerts.map((a) => (
              <button
                key={a.product_id}
                type="button"
                className={`alert-chip ${a.status === "Red" ? "alert-chip-red" : "alert-chip-yellow"}`}
                onClick={() => void runAnalysis(a.product_id)}
              >
                {a.product_name}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="page-grid grid-2">
        <article className="card">
          <h3>Run Product Analysis</h3>
          <div className="stack">
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
              <option value="">Select product</option>
              {items.map((i) => (
                <option value={i.product_id} key={i.product_id}>
                  {i.product_id} — {i.product_name}
                </option>
              ))}
            </select>
            <div className="row-wrap">
              <button className="button" type="button" onClick={() => void runAnalysis()} disabled={!selectedProduct || analyzing}>
                Analyze SKU
              </button>
              <button className="button button-ghost" type="button" onClick={() => void loadInventory()} disabled={loading}>
                ↻ Reload
              </button>
            </div>
          </div>

          {analysis && (
            <div className="stack" style={{ marginTop: 4 }}>
              <hr className="divider" />
              <div className="row">
                <strong style={{ color: "var(--text)", fontSize: 14 }}>{analysis.product_name}</strong>
                <span className={statusClass(analysis.status)}>{analysis.status}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Days Until Stockout", analysis.days_until_stockout],
                  ["EOQ", analysis.eoq],
                  ["Safety Stock", analysis.safety_stock],
                  ["Reorder Point", analysis.reorder_point?.toFixed(0)],
                  ["Estimated Cost", `$${analysis.estimated_cost}`],
                  ["Lead Time", `${analysis.used_lead_time_days}d`],
                  ["Unit Cost", `$${analysis.used_unit_cost}`],
                  ["Avg Daily", analysis.used_avg_daily_consumption],
                ].map(([label, value]) => (
                  <div key={String(label)} style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "10px 12px",
                  }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                      {String(label)}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{String(value)}</div>
                  </div>
                ))}
              </div>

              <div className="row">
                <span className="section-label">Data Completeness</span>
                <span className={completenessClass(analysis.data_completeness)}>{analysis.data_completeness}</span>
              </div>

              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: 12 }}>
                <div className="section-label" style={{ marginBottom: 8 }}>Recommended Action</div>
                <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                  {analysis.recommended_action}
                </p>
                <div className="prose">
                  <ReactMarkdown>{analysis.reasoning}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="card">
          <h3>Inventory Snapshot</h3>
          <input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 4 }}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr
                    key={i.product_id}
                    onClick={() => void runAnalysis(i.product_id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ color: "var(--text)" }}>{i.product_name}</td>
                    <td>
                      <span className={stockColorClass(i.quantity_in_stock, i.reorder_threshold)} style={{ fontWeight: 600, fontFamily: "var(--mono)" }}>
                        {i.quantity_in_stock}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--mono)" }}>{i.reorder_threshold}</td>
                    <td style={{ color: "var(--muted)" }}>{i.warehouse ?? "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)" }}>No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}