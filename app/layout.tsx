import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

/**
 * Default `<head>` metadata injected by Next.js on every page.
 */
export const metadata: Metadata = {
  title: "SA Motors (TRIAL TASK) London — DealerOS",
  description: "DealerOS v4 — Dealer Management System",
};

/**
 * Root layout wrapping every route with the HTML shell, global fonts, and
 * the persistent {@link Shell} chrome (sidebar, topbar, modals).
 * @param {{ children: React.ReactNode }} props - Props object.
 * @param {React.ReactNode} props.children - Route-level page content rendered inside {@link Shell}.
 * @returns {JSX.Element} The full `<html>` document for the app.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
