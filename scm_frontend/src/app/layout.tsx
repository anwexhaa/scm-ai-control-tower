// import type { Metadata } from "next";
// import { IBM_Plex_Mono, Manrope } from "next/font/google";
// import { AppShell } from "@/components/app-shell";
// import "./globals.css";

// const manrope = Manrope({
//   variable: "--font-sans",
//   subsets: ["latin"],
// });

// const plexMono = IBM_Plex_Mono({
//   variable: "--font-mono",
//   subsets: ["latin"],
//   weight: ["400", "500"],
// });

// export const metadata: Metadata = {
//   title: "SCM Control Tower",
//   description: "Enterprise frontend for supply chain operations",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body className={`${manrope.variable} ${plexMono.variable}`}>
//         <AppShell>{children}</AppShell>
//       </body>
//     </html>
//   );
// }
import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const manrope = Manrope({ variable: "--font-sans", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "SCM Control Tower",
  description: "Enterprise frontend for supply chain operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${plexMono.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}