import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WC26 · Morning Dashboard",
  description: "FIFA World Cup 2026 — ITV/BBC highlights, live standings & fixtures",
  openGraph: {
    title: "WC26 · Morning Dashboard",
    description: "FIFA World Cup 2026 — ITV/BBC highlights, live standings & fixtures",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page-glow" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
