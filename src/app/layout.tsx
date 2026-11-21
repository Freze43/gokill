import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { countPending } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIVERA — Setoran & Verifikasi Pendapatan KA",
  description:
    "Sistem pencatatan, pemantauan, dan verifikasi setoran pendapatan 63 Kereta Api: master KA, kalender pendapatan, verifikasi, dan slip setoran resmi.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  let pendingCount = 0;
  try {
    pendingCount = await countPending();
  } catch {
    pendingCount = 0;
  }

  const session = await getSession();

  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-ink-900 antialiased">
        {session ? (
          <AppShell pendingCount={pendingCount} session={session}>
            {children}
          </AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
