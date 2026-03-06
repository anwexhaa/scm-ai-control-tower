// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import { api } from "@/lib/api";
// import type { AppHealth, FileRecord, InventoryAnalysis, InventoryItem } from "@/lib/types";
// import { statusClass } from "@/lib/ui";

// export default function DashboardPage() {
//   const [health, setHealth] = useState<AppHealth | null>(null);
//   const [inventory, setInventory] = useState<InventoryItem[]>([]);
//   const [alerts, setAlerts] = useState<InventoryAnalysis[]>([]);
//   const [files, setFiles] = useState<FileRecord[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const load = useCallback(async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const [h, inv, a, f] = await Promise.all([
//         api.getHealth(),
//         api.getInventory(),
//         api.getInventoryAlerts(),
//         api.listUploadedFiles(),
//       ]);
//       setHealth(h);
//       setInventory(inv);
//       setAlerts(a);
//       setFiles(f);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load dashboard");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     void load();
//   }, [load]);

//   const stats = useMemo(
//     () => ({
//       inventory: inventory.length,
//       red: alerts.filter((a) => a.status === "Red").length,
//       yellow: alerts.filter((a) => a.status === "Yellow").length,
//       files: files.length,
//     }),
//     [alerts, files.length, inventory.length],
//   );

//   return (
//     <main className="page-wrap">
//       <section className="page-hero row">
//         <div>
//           <h1>Operations Dashboard</h1>
//           <p>System overview, active risk signals, and data freshness.</p>
//         </div>
//         <button className="button" type="button" onClick={() => void load()}>
//           Refresh
//         </button>
//       </section>

//       {error ? <p className="banner banner-danger">{error}</p> : null}
//       {loading ? <p className="banner">Loading latest metrics...</p> : null}

//       <section className="page-grid grid-4">
//         <article className="card stat">
//           <h2>Inventory Records</h2>
//           <p>{stats.inventory}</p>
//         </article>
//         <article className="card stat">
//           <h2>Red Alerts</h2>
//           <p>{stats.red}</p>
//         </article>
//         <article className="card stat">
//           <h2>Yellow Alerts</h2>
//           <p>{stats.yellow}</p>
//         </article>
//         <article className="card stat">
//           <h2>Total Uploads</h2>
//           <p>{stats.files}</p>
//         </article>
//       </section>

//       <section className="page-grid grid-2">
//         <article className="card">
//           <h3>System Health</h3>
//           <div className="kv"><span>Status</span><strong>{health?.status ?? "-"}</strong></div>
//           <div className="kv"><span>Service</span><strong>{health?.system ?? "-"}</strong></div>
//           <div className="kv"><span>Database</span><strong>{health?.db_configured ? "Configured" : "Missing"}</strong></div>
//           <div className="kv"><span>LLM Key</span><strong>{health?.api_key_configured ? "Configured" : "Missing"}</strong></div>
//         </article>

//         <article className="card">
//           <h3>Critical Inventory Alerts</h3>
//           {alerts.length === 0 ? <p className="muted">No alerting items.</p> : null}
//           <div className="list">
//             {alerts.slice(0, 8).map((a) => (
//               <div className="item row" key={`${a.product_id}-${a.status}`}>
//                 <span>{a.product_name}</span>
//                 <span className={statusClass(a.status)}>{a.status}</span>
//               </div>
//             ))}
//           </div>
//         </article>
//       </section>

//       <section className="card">
//         <h3>Recent Uploads</h3>
//         <div className="table-wrap">
//           <table>
//             <thead>
//               <tr>
//                 <th>Filename</th>
//                 <th>Type</th>
//                 <th>Rows</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {files.slice(0, 10).map((f) => (
//                 <tr key={f.file_id}>
//                   <td>{f.filename}</td>
//                   <td>{f.file_type}</td>
//                   <td>{f.row_count}</td>
//                   <td>{f.status}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </section>
//     </main>
//   );
// }
import { redirect } from "next/navigation";
export default function RootPage() {
  redirect("/dashboard");
}