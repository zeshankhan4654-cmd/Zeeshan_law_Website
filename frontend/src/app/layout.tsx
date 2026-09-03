import type { Metadata } from "next";
import { Archivo, Newsreader } from "next/font/google";
import { QueryProvider } from "@/lib/query-provider";
import "./globals.css";

// Self-hosted at build time by Next.js — no request to Google at runtime.
const archivo = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader-loaded",
  display: "swap",
});
const sans = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Arbitrator & Law Associates",
  description: "Advocates, Arbitrators & Legal Consultants — Peshawar High Court, Peshawar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${sans.variable}`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
