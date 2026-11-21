"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActorProvider, ROLE_META, ROLE_PERMISSIONS, useActor, type ActorRole } from "@/components/actor-context";
import type { SessionUser } from "@/lib/auth";
import {
  IconBell,
  IconCalendar,
  IconChevronDown,
  IconDashboard,
  IconMobile,
  IconMenu,
  IconPlus,
  IconPrinter,
  IconQr,
  IconReceipt,
  IconSettings,
  IconShieldCheck,
  IconTrain,
  IconX,
} from "@/components/icons";
import { cn, formatTanggal, initials, todayISO } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: (props: { size?: number; className?: string }) => React.ReactElement;
  roles: ActorRole[];
  badge?: number;
};

type NavGroup = { title: string; items: NavItem[] };

const PAGE_TITLES: Record<string, { title: string; breadcrumb: string }> = {
  "/": { title: "Dashboard Pendapatan", breadcrumb: "Operasional" },
  "/kalender": { title: "Kalender Pendapatan", breadcrumb: "Operasional" },
  "/setoran": { title: "Data Setoran KA", breadcrumb: "Operasional" },
  "/setoran/baru": { title: "Input Setoran Baru", breadcrumb: "Data Setoran" },
  "/mobile": { title: "Input Setoran Crew (HP)", breadcrumb: "Operasional" },
  "/verifikasi": { title: "Verifikasi Setoran (Kasir)", breadcrumb: "Operasional" },
  "/slip": { title: "Slip & Rekapitulasi", breadcrumb: "Pelaporan" },
  "/master-unit": { title: "Master Unit Setoran", breadcrumb: "Administrasi" },
  "/pengaturan": { title: "Pengaturan Unit", breadcrumb: "Administrasi" },
  "/audit": { title: "Jejak Audit Verifikasi", breadcrumb: "Administrasi" },
  "/dokumentasi": { title: "Skema Database & Alur Sistem", breadcrumb: "Panduan" },
};

function useGroups(pendingCount: number): NavGroup[] {
  return [
    {
      title: "Operasional",
      items: [
        { href: "/", label: "Dashboard", icon: IconDashboard, roles: ["admin", "sales", "crew", "kasir"] },
        { href: "/setoran/baru", label: "Input Setoran", icon: IconPlus, roles: ["admin", "sales", "crew"] },
        { href: "/mobile", label: "Input via HP (Crew)", icon: IconMobile, roles: ["crew", "sales"] },
        { href: "/setoran", label: "Data Setoran", icon: IconReceipt, roles: ["admin", "sales", "crew", "kasir"] },
        {
          href: "/verifikasi",
          label: "Verifikasi (Kasir)",
          icon: IconShieldCheck,
          roles: ["admin", "kasir"],
          badge: pendingCount,
        },
        { href: "/kalender", label: "Kalender Pendapatan", icon: IconCalendar, roles: ["admin", "sales", "crew", "kasir"] },
      ],
    },
    {
      title: "Pelaporan",
      items: [
        { href: "/slip", label: "Slip & Rekap (Kasir)", icon: IconPrinter, roles: ["admin", "kasir"] },
        { href: "/dokumentasi", label: "Skema & Alur", icon: IconQr, roles: ["admin", "sales", "crew", "kasir"] },
      ],
    },
    {
      title: "Administrasi",
      items: [
        { href: "/master-unit", label: "Master Unit (79)", icon: IconTrain, roles: ["admin"] },
        { href: "/pengaturan", label: "Pengaturan & Peran", icon: IconSettings, roles: ["admin"] },
        { href: "/audit", label: "Jejak Audit", icon: IconShieldCheck, roles: ["admin"] },
      ],
    },
  ];
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-300 to-brand-500 text-ink-950 shadow-[0_8px_20px_-8px_rgba(249,179,47,0.9)]">
        <IconTrain size={22} />
      </span>
      <span className={cn("leading-tight", compact && "hidden")}>
        <span className="block text-[1.05rem] font-extrabold tracking-[0.14em] text-white">SIVERA</span>
        <span className="block text-[0.62rem] font-medium tracking-[0.06em] text-white/55">
          Setoran KA, Parkir, Cafe &amp; Booth
        </span>
      </span>
    </Link>
  );
}

function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { actor } = useActor();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3.5 pb-4">
      {groups.map((group) => {
        const items = group.items.filter((item) => item.roles.includes(actor.role));
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="mb-2 px-2.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/35">
              {group.title}
            </p>
            <ul className="space-y-1">
              {items.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.82rem] font-medium transition",
                        active
                          ? "bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                          : "text-white/60 hover:bg-white/[0.06] hover:text-white/90",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" />
                      )}
                      <Icon size={18} className={cn(active ? "text-brand-300" : "text-white/45 group-hover:text-white/75")} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-md bg-brand-400/20 px-1.5 py-0.5 text-[0.65rem] font-bold text-brand-200">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function AccountMenu({ variant = "sidebar", session }: { variant?: "sidebar" | "header"; session?: SessionUser }) {
  const router = useRouter();
  const { actor } = useActor();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl text-left transition",
          variant === "sidebar"
            ? "bg-white/[0.06] p-2.5 ring-1 ring-white/10 hover:bg-white/[0.1]"
            : "p-1.5 hover:bg-slate-100",
        )}
      >
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold",
            variant === "sidebar" ? "bg-brand-400 text-ink-950" : "bg-ink-800 text-white",
          )}
        >
          {initials(actor.nama) || "SV"}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className={cn("block truncate text-[0.78rem] font-semibold", variant === "sidebar" ? "text-white" : "text-ink-900")}>
            {actor.nama}
          </span>
          <span className={cn("block truncate text-[0.65rem]", variant === "sidebar" ? "text-white/45" : "text-slate-500")}>
            {ROLE_META[actor.role].label}
            {session?.email ? ` · ${session.email}` : ""}
          </span>
        </span>
        <IconChevronDown size={15} className={variant === "sidebar" ? "text-white/40" : "text-slate-400"} />
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Tutup" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "absolute z-50 w-[16.5rem] animate-pop rounded-2xl border border-line bg-white p-3 shadow-float",
              variant === "sidebar" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2",
            )}
          >
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-800 text-[0.62rem] font-bold text-white">
                {ROLE_META[actor.role].inisial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[0.74rem] font-bold text-ink-900">{actor.nama}</p>
                <p className="truncate text-[0.62rem] text-slate-500">{ROLE_META[actor.role].label} · {ROLE_META[actor.role].deskripsi}</p>
              </div>
            </div>
            <dl className="mt-2 space-y-1 text-[0.68rem]">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Email</dt>
                <dd className="truncate font-medium text-ink-900">{session?.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-400">Hak akses</dt>
                <dd className="font-medium text-ink-900">{ROLE_PERMISSIONS[actor.role].length} modul</dd>
              </div>
            </dl>
            <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[0.62rem] leading-relaxed text-slate-500">
              Sesi terverifikasi di server (HttpOnly cookie). Peran tidak dapat diubah dari browser.
            </p>
            <button
              type="button"
              onClick={logout}
              disabled={busy}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.75rem] font-semibold text-white hover:bg-ink-900 disabled:opacity-60"
            >
              <IconX size={14} /> {busy ? "Keluar…" : "Keluar dari akun"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ShellInner({ children, pendingCount, session }: { children: React.ReactNode; pendingCount: number; session: SessionUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { actor } = useActor();
  const groups = useGroups(pendingCount);
  const pageInfo =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/slip/") ? { title: "Slip Setoran Resmi", breadcrumb: "Pelaporan" } : PAGE_TITLES["/"]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="print-hidden sticky top-0 hidden h-screen w-[16.5rem] shrink-0 flex-col bg-gradient-to-b from-ink-900 via-ink-900 to-ink-950 lg:flex">
        <div className="px-4 py-5">
          <Brand />
        </div>
        <div className="mx-3.5 mb-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[0.68rem] font-medium text-white/60">Sistem aktif · DAOP 1 Jakarta</span>
        </div>
        <SidebarNav groups={groups} />
        <div className="border-t border-white/[0.08] p-3">
          <AccountMenu session={session} />
          <p className="mt-2 px-1 text-center text-[0.6rem] text-white/25">SIVERA v1.0 · Modul 1–4</p>
        </div>
      </aside>

      {mobileOpen && (
        <div className="print-hidden fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[17rem] animate-rise flex-col bg-gradient-to-b from-ink-900 to-ink-950">
            <div className="flex items-center justify-between px-4 py-5">
              <Brand />
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10">
                <IconX size={18} />
              </button>
            </div>
            <SidebarNav groups={groups} onNavigate={() => setMobileOpen(false)} />
            <div className="border-t border-white/10 p-3">
              <AccountMenu session={session} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print-hidden sticky top-0 z-30 border-b border-line/80 bg-white/85 backdrop-blur-md">
          <div className="flex h-[4.2rem] items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-line p-2 text-ink-800 hover:bg-slate-50 lg:hidden"
              aria-label="Buka menu"
            >
              <IconMenu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block">
                {pageInfo.breadcrumb} / <span className="text-ink-600">{pageInfo.title}</span>
              </p>
              <h1 className="truncate text-[0.98rem] font-bold text-ink-900 sm:text-[1.05rem]">{pageInfo.title}</h1>
            </div>
            <div className="hidden items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[0.72rem] font-medium text-slate-500 md:flex">
              <IconCalendar size={14} className="text-ink-600" />
              {formatTanggal(todayISO(), true)}
            </div>
            <Link
              href="/verifikasi"
              className="relative rounded-lg border border-line bg-white p-2 text-slate-500 transition hover:text-ink-800"
              aria-label="Antrean verifikasi"
            >
              <IconBell size={17} />
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[0.58rem] font-bold text-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
            {actor.role === "kasir" || actor.role === "admin" ? (
              <Link
                href={actor.role === "admin" ? "/master-unit" : "/verifikasi"}
                className="hidden items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.75rem] font-semibold text-white shadow-sm transition hover:bg-ink-900 sm:flex"
              >
                {actor.role === "admin" ? <IconTrain size={15} /> : <IconShieldCheck size={15} />}
                {actor.role === "admin" ? "Master Unit" : "Verifikasi"}
              </Link>
            ) : (
              <Link
                href="/setoran/baru"
                className="hidden items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.75rem] font-semibold text-white shadow-sm transition hover:bg-ink-900 sm:flex"
              >
                <IconPlus size={15} /> Input Setoran
              </Link>
            )}
            <div className="lg:hidden">
              <AccountMenu variant="header" session={session} />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>

        <footer className="print-hidden border-t border-line/70 px-5 py-4 text-center text-[0.68rem] text-slate-400">
          SIVERA — Sistem Pencatatan, Pemantauan &amp; Verifikasi Setoran Pendapatan (KA · Parkir · Loko Cafe · Booth Loko) ·{" "}
          {new Date().getFullYear()} · Data contoh untuk simulasi
        </footer>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  pendingCount = 0,
  session,
}: {
  children: React.ReactNode;
  pendingCount?: number;
  session: SessionUser;
}) {
  return (
    <ActorProvider initialActor={{ role: session.role, nama: session.nama }}>
      <ShellInner pendingCount={pendingCount} session={session}>
        {children}
      </ShellInner>
    </ActorProvider>
  );
}
