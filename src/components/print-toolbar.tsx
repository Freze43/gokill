"use client";

import Link from "next/link";
import { IconChevronLeft, IconPrinter } from "@/components/icons";

export function PrintToolbar({ backHref = "/slip", label = "Kembali" }: { backHref?: string; label?: string }) {
  return (
    <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50"
      >
        <IconChevronLeft size={15} /> {label}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden text-[0.7rem] text-slate-400 sm:block">Gunakan “Simpan sebagai PDF” pada dialog cetak.</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-3.5 py-2 text-[0.76rem] font-bold text-white hover:bg-ink-900"
        >
          <IconPrinter size={15} /> Cetak / PDF
        </button>
      </div>
    </div>
  );
}
