import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WC26 Dashboard",
  description: "FIFA World Cup 2026 — ITV/BBC highlights, live standings & fixtures",
  openGraph: {
    title: "WC26 Dashboard",
    description: "FIFA World Cup 2026 — ITV/BBC highlights, live standings & fixtures",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}` }} />
      </head>
      <body>
        <div className="page-glow" />
        <div className="relative z-10">{children}</div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
