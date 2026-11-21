"use client";

import { useState } from "react";
import { cn, formatTanggal, rupiah, rupiahShort } from "@/lib/utils";

export type DailyPoint = { tanggal: string; total: number; terverifikasi: number };

export function RevenueBarChart({ data, totalUnit }: { data: DailyPoint[]; totalUnit: number }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((point) => Number(point.total)));
  const activePoint = active !== null ? data[active] : null;

  if (data.length === 0) {
    return (
      <div className="grid h-[180px] place-items-center text-[0.78rem] text-slate-400">
        Belum ada data pendapatan pada periode ini.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[0.65rem] font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-gradient-to-b from-brand-300 to-brand-500" /> Total setoran
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-ink-100" /> Kapasitas 63 KA
          </span>
        </div>
        <div className="numeric rounded-md bg-ink-50 px-2 py-1 text-[0.65rem] font-semibold text-ink-700">
          {activePoint ? `${formatTanggal(activePoint.tanggal)} · ${rupiah(activePoint.total)}` : `Total ${rupiahShort(data.reduce((sum, p) => sum + Number(p.total), 0))}`}
        </div>
      </div>
      <div className="flex h-[168px] items-end gap-[3px] sm:gap-1">
        {data.map((point, index) => {
          const height = Math.max(4, Math.round((Number(point.total) / max) * 100));
          const ratio = Math.min(100, Math.round((Number(point.terverifikasi) / Math.max(totalUnit, 1)) * 100));
          return (
            <button
              key={point.tanggal}
              type="button"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              className="group relative flex h-full flex-1 flex-col justify-end outline-none"
              title={`${formatTanggal(point.tanggal)} — ${rupiah(point.total)}`}
            >
              <span
                className={cn(
                  "w-full rounded-t-[3px] bg-gradient-to-t from-brand-500 to-brand-300 transition-all",
                  active === index && "from-ink-800 to-ink-500",
                )}
                style={{ height: `${height}%` }}
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-ink-900/10">
                <span className="block h-full bg-emerald-500/60" style={{ width: `${ratio}%` }} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.6rem] font-medium text-slate-400">
        <span>{formatTanggal(data[0].tanggal)}</span>
        <span>{formatTanggal(data[data.length - 1].tanggal)}</span>
      </div>
    </div>
  );
}

export function StatusDonut({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  centerLabel: string;
  centerValue: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[104px] w-[104px] shrink-0">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef2f7" strokeWidth="6" />
          {segments.map((segment) => {
            const length = (segment.value / total) * 100;
            const dash = `${length} ${100 - length}`;
            const circle = (
              <circle
                key={segment.label}
                cx="21"
                cy="21"
                r="15.9"
                fill="none"
                stroke={segment.color}
                strokeWidth="6"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="numeric text-[0.98rem] font-extrabold leading-none text-ink-900">{centerValue}</span>
          <span className="mt-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-slate-400">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-2 text-[0.72rem]">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="numeric font-semibold text-ink-900">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
