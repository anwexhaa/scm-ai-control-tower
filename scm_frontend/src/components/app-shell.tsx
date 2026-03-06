// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import type { ReactNode } from "react";

// const navItems = [
//   { href: "/", label: "Dashboard" },
//   { href: "/inventory", label: "Inventory" },
//   { href: "/uploads", label: "Uploads" },
//   { href: "/intelligence", label: "Intelligence" },
//   { href: "/agents", label: "Agents" },
// ];

// const pageTitles: Record<string, { title: string; subtitle: string }> = {
//   "/": { title: "Dashboard", subtitle: "Operational overview" },
//   "/inventory": { title: "Inventory", subtitle: "Stock and reorder analysis" },
//   "/uploads": { title: "Uploads", subtitle: "CSV and document ingestion" },
//   "/intelligence": { title: "Intelligence", subtitle: "Document Q&A workspace" },
//   "/agents": { title: "Agents", subtitle: "Multi-agent orchestration" },
// };

// function isActive(pathname: string, href: string) {
//   if (href === "/") return pathname === "/";
//   return pathname.startsWith(href);
// }

// export function AppShell({ children }: { children: ReactNode }) {
//   const pathname = usePathname();
//   const header = pageTitles[pathname] ?? {
//     title: "SCM Control Tower",
//     subtitle: "Supply chain workspace",
//   };

//   return (
//     <div className="app-shell">
//       <aside className="sidebar">
//         <div className="brand-block">
//           <p className="brand-kicker">Enterprise Suite</p>
//           <h1 className="brand-title">SCM Control Tower</h1>
//           <p className="brand-subtle">Operations intelligence console</p>
//         </div>

//         <nav className="nav-list" aria-label="Main">
//           {navItems.map((item) => (
//             <Link
//               key={item.href}
//               href={item.href}
//               className={`nav-link ${isActive(pathname, item.href) ? "nav-link-active" : ""}`}
//             >
//               {item.label}
//             </Link>
//           ))}
//         </nav>
//       </aside>

//       <div className="content-area">
//         <header className="topbar">
//           <h2 className="top-title">{header.title}</h2>
//           <p className="top-subtitle">{header.subtitle}</p>
//         </header>
//         {children}
//       </div>
//     </div>
//   );
// }
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard",   label: "Dashboard",   icon: "▦" },
  { href: "/uploads",     label: "Uploads",     icon: "↑" },
  { href: "/inventory",   label: "Inventory",   icon: "◫" },
  { href: "/agents",      label: "Agents",      icon: "⬡" },
  { href: "/reports",     label: "Reports",     icon: "≡" },
  { href: "/intelligence",label: "Intelligence",icon: "◈" },
  { href: "/data-query",  label: "Data Query",  icon: "⊙" },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":    { title: "Operations Dashboard",   subtitle: "System overview and risk signals" },
  "/uploads":      { title: "Data Ingestion",         subtitle: "CSV and PDF pipeline" },
  "/inventory":    { title: "Inventory Intelligence", subtitle: "SKU analysis and stock health" },
  "/agents":       { title: "Agent Orchestration",    subtitle: "Multi-agent workflow execution" },
  "/reports":      { title: "Executive Reports",      subtitle: "KPI reporting and PDF export" },
  "/intelligence": { title: "Knowledge Intelligence", subtitle: "RAG over indexed PDF documents" },
  "/data-query":   { title: "Data Query",             subtitle: "Query live supply chain data" },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = pageTitles[pathname] ?? { title: "SCM Control Tower", subtitle: "" };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-title">SCM Tower</div>
          <div className="sidebar-logo-sub">v2.0 · Control Layer</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${pathname === item.href ? " nav-link-active" : ""}`}
            >
              <span style={{ fontFamily: "monospace", fontSize: 13 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--label)", letterSpacing: "0.08em" }}>
            BACKEND · 127.0.0.1:8000
          </div>
        </div>
      </aside>

      <div className="content-area">
        <div className="topbar">
          <div>
            <div className="topbar-title">{meta.title}</div>
            {meta.subtitle && <div className="topbar-sub">{meta.subtitle}</div>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}