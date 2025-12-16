"use client";
import { useState } from "react";

export default function InventoryTable({ rows }: { rows: any[] }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="overflow-auto rounded border border-gray-800">
      <table className="min-w-full text-sm text-gray-200">
        <thead className="bg-[#071126] text-gray-400">
          <tr>
            <th className="px-4 py-3 text-left">SKU</th>
            <th className="px-4 py-3 text-left">Warehouse</th>
            <th className="px-4 py-3 text-right">On-hand</th>
            <th className="px-4 py-3 text-right">Safety stock</th>
            <th className="px-4 py-3 text-right">Lead time</th>
            <th className="px-4 py-3 text-right">Avg daily demand</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const low = r.onhand < r.safety;
            return (
              <tr
                key={i}
                className={`border-t border-gray-800 ${
                  hover === i ? "bg-[#071122]" : ""
                }`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <td className="px-4 py-3">{r.sku}</td>
                <td className="px-4 py-3">{r.warehouse}</td>
                <td className="px-4 py-3 text-right">{r.onhand}</td>
                <td className="px-4 py-3 text-right">{r.safety}</td>
                <td className="px-4 py-3 text-right">{r.leadTime}d</td>
                <td className="px-4 py-3 text-right">{r.avgDemand}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      low ? "bg-red-600 text-white" : "bg-green-600 text-white"
                    }`}
                  >
                    {low ? "Low Stock" : "Normal"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
