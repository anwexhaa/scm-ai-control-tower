"use client";
import { useState } from "react";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-lg shadow-2xl p-6 border border-slate-800">
      {children}
    </div>
  );
}

export default function AgentPage() {
  const [productId, setProductId] = useState("P001");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function queryInventory() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_inventory", product_id: productId }),
      });
      if (!res.ok) {
        throw new Error(`Error: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            Agent Decisions
          </h1>
          <p className="text-slate-400 text-lg">
            Agentic reasoning and decision-making output
          </p>
        </div>

        {/* Product ID input form */}
        <div className="mb-8 bg-slate-900 p-6 rounded-xl border border-slate-800">
          <label htmlFor="productId" className="block mb-3 font-semibold text-white text-lg">
            Enter Product ID
          </label>
          <div className="flex gap-3">
            <input
              id="productId"
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="border border-slate-700 bg-slate-800 text-white p-3 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent transition-all"
              placeholder="e.g. P001"
            />
            <button
              onClick={queryInventory}
              disabled={loading || productId.trim() === ""}
              className="px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-slate-700"
            >
              {loading ? "Loading..." : "Check Inventory"}
            </button>
          </div>
        </div>

        <Card>
          {error && (
            <div className="bg-red-950 border border-red-900 text-red-200 p-4 rounded-lg mb-4">
              <div className="font-semibold mb-1">Error</div>
              {error}
            </div>
          )}

          {!data && !loading && (
            <div className="text-center py-12">
              <div className="text-slate-500 text-lg">No data yet. Enter a product ID to begin.</div>
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {data.issue ? (
                <>
                  {/* Low Stock Alert */}
                  <div className="bg-red-950 border-l-4 border-red-600 text-white p-5 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-bold text-lg">Low Stock Alert</span>
                    </div>
                    <div className="text-red-100 font-medium">
                      Product: <span className="font-mono bg-red-900 px-2 py-1 rounded text-yellow-300">{data.issue.sku}</span> · Warehouse: {data.issue.warehouse}
                    </div>
                  </div>

                  {/* Decision Summary */}
                  <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
                    <div className="text-slate-300 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Decision Summary
                    </div>
                    <div className="text-white text-lg leading-relaxed">
                      Reorder <span className="font-bold text-white">{data.recommendation?.qty} units</span> for <span className="font-mono bg-slate-700 px-2 py-1 rounded text-yellow-300">{data.issue.sku}</span> at <span className="font-semibold">{data.issue.warehouse}</span>.
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
                    <div className="text-slate-300 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Reasoning
                    </div>
                    <div className="text-slate-200 leading-relaxed bg-black p-4 rounded-lg border border-slate-800">
                      {data.reasoning}
                    </div>
                  </div>

                  {/* Referenced Context */}
                  <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
                    <div className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                      Referenced Context
                    </div>
                    <div className="text-slate-300 text-sm leading-relaxed bg-black p-4 rounded border border-slate-800">
                      {data.context}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Normal Stock - Green Status */}
                  <div className="bg-emerald-950 border-l-4 border-emerald-600 text-white p-5 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-bold text-lg">Healthy Stock Level</span>
                    </div>
                    <div className="text-emerald-100">
                      {data.result}
                    </div>
                  </div>

                  {/* Optimization Suggestions */}
                  <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
                    <div className="text-slate-300 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      Optimization Opportunities
                    </div>
                    <div className="space-y-3 text-slate-200">
                      <div className="flex items-start gap-3 bg-black p-3 rounded border border-slate-800">
                        <span className="text-slate-400 font-bold">•</span>
                        <div>
                          <div className="font-semibold text-white">Inventory Analysis</div>
                          <div className="text-sm text-slate-400">Current stock levels are optimal. Consider analyzing sales velocity to predict future demand patterns.</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-black p-3 rounded border border-slate-800">
                        <span className="text-slate-400 font-bold">•</span>
                        <div>
                          <div className="font-semibold text-white">Cost Optimization</div>
                          <div className="text-sm text-slate-400">Review supplier contracts for potential bulk discounts or better payment terms.</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-black p-3 rounded border border-slate-800">
                        <span className="text-slate-400 font-bold">•</span>
                        <div>
                          <div className="font-semibold text-white">Warehouse Efficiency</div>
                          <div className="text-sm text-slate-400">Stock levels allow for strategic positioning of fast-moving items closer to shipping areas.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}