"use client";
import Link from "next/link";

export default function Sidebar() {
  const items = [
    { href: "/", label: "Home" },
    { href: "/control", label: "Control Tower" },
    { href: "/upload", label: "Upload Knowledge" },
    { href: "/ask", label: "Ask Questions" },
    { href: "/inventory", label: "Inventory" },
    { href: "/agent", label: "Agent Decisions" },
  ];

  return (
    <aside className="w-72 bg-[var(--panel)] border-r border-gray-800 p-6 text-gray-200 relative">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] flex items-center justify-center text-white font-bold">
          N
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-100">
            Control Tower
          </h2>
          <div className="text-xs text-gray-400">Supply Chain</div>
        </div>
      </div>

      <nav className="space-y-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="block">
            <div className="px-3 py-3 rounded-lg cursor-pointer text-gray-300 hover:bg-gray-800 hover:text-white transition flex items-center gap-3">
              <div className="w-3 h-3 bg-gray-600 rounded-full" />
              <div>{it.label}</div>
            </div>
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-6 left-6 text-sm text-gray-400">
        Settings
      </div>
    </aside>
  );
}
