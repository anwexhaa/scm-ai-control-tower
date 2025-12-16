import "./globals.css";
import Sidebar from "./components/Sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Temporary Tailwind CDN fallback while local build is fixed */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-[var(--bg-900)] text-gray-200 antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />

          {/* Main Content */}
          <main className="flex-1 bg-transparent p-8 overflow-auto">
            <div className="container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
