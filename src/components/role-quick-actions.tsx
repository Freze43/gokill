"use client";

import Link from "next/link";
import { ROLE_META, useActor } from "@/components/actor-context";
import { IconMobile, IconPlus, IconPrinter, IconSettings, IconShieldCheck, IconTrain } from "@/components/icons";

export function RoleQuickActions({ pending }: { pending: number }) {
  const { actor } = useActor();
  const base =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[0.76rem] font-semibold transition";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-wide text-white/70">
        {ROLE_META[actor.role].label}
        <span className="hidden text-white/35 sm:inline">· {ROLE_META[actor.role].deskripsi}</span>
      </span>

      {(actor.role === "sales" || actor.role === "crew") && (
        <>
          <Link href="/setoran/baru" className={`${base} bg-brand-400 text-ink-950 hover:bg-brand-300`}>
            <IconPlus size={15} /> Input Setoran
          </Link>
          <Link href="/mobile" className={`${base} border border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.12]`}>
            <IconMobile size={15} /> Mode HP (Crew)
          </Link>
        </>
      )}

      {(actor.role === "kasir" || actor.role === "admin") && (
        <>
          <Link href="/verifikasi" className={`${base} bg-brand-400 text-ink-950 hover:bg-brand-300`}>
            <IconShieldCheck size={15} /> Verifikasi
            {pending > 0 && (
              <span className="rounded bg-ink-950/15 px-1.5 py-0.5 text-[0.62rem] font-bold text-ink-950">{pending}</span>
            )}
          </Link>
          <Link href="/slip" className={`${base} border border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.12]`}>
            <IconPrinter size={15} /> Terbitkan Slip
          </Link>
        </>
      )}

      {actor.role === "admin" && (
        <>
          <Link href="/master-unit" className={`${base} border border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.12]`}>
            <IconTrain size={15} /> Master Unit
          </Link>
          <Link href="/pengaturan" className={`${base} border border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.12]`}>
            <IconSettings size={15} /> Peran
          </Link>
        </>
      )}
    </div>
  );
}
