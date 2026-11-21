"use client";

import Link from "next/link";
import { useState } from "react";
import { IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconTrain, IconX } from "@/components/icons";
import { KategoriBadge, Modal, StatusBadge } from "@/components/ui";
import { cn, formatTanggal, formatWaktu, monthLabel, rupiah, rupiahShort, shiftMonth, todayISO } from "@/lib/utils";

export type CalendarDay = {
  tanggal: string;
  jumlah: number;
  total: number;
  tunai: number;
  nonTunai: number;
  terverifikasi: number;
  menunggu: number;
  selisih: number;
  verifiedTotal: number;
};

export type CalendarPayload = {
  bulan: string;
  totalUnit: number;
  days: Record<string, CalendarDay>;
  totals: Omit<CalendarDay, "tanggal">;
};

export type DayRow = {
  id: number;
  kodeSetoran: string;
  tanggalDinas: string;
  kategori: string;
  namaUnit: string;
  nomorUnit: string;
  layanan: string;
  relasi: string;
  shift: string;
  petugas: string;
  tunai: number;
  nonTunai: number;
  total: number;
  status: string;
  verifikator: string | null;
  verifiedAt: string | null;
};

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function dayTone(day?: CalendarDay) {
  if (!day || day.jumlah === 0) return "empty";
  if (day.selisih > 0) return "selisih";
  if (day.menunggu > 0) return "menunggu";
  return "lengkap";
}

export function CalendarView({ data }: { data: CalendarPayload }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<DayRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [year, month] = data.bulan.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const today = todayISO();
  const prev = shiftMonth(data.bulan, -1);
  const next = shiftMonth(data.bulan, 1);

  const cells: Array<{ date: string | null; dayNumber: number | null; data?: CalendarDay }> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ date: null, dayNumber: null });
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = `${data.bulan}-${String(d).padStart(2, "0")}`;
    cells.push({ date, dayNumber: d, data: data.days[date] });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, dayNumber: null });

  async function openDay(date: string) {
    setSelected(date);
    setDetail(null);
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/kalender?tanggal=${date}`);
      const payload = (await response.json()) as { ok: boolean; data?: DayRow[]; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Gagal memuat rincian");
        return;
      }
      setDetail(payload.data ?? []);
    } catch {
      setError("Gagal memuat rincian transaksi");
    } finally {
      setLoading(false);
    }
  }

  const dayData = selected ? data.days[selected] : undefined;
  const toneStyles: Record<string, string> = {
    lengkap: "border-emerald-200 bg-emerald-50/60 hover:border-emerald-400",
    menunggu: "border-amber-200 bg-amber-50/70 hover:border-amber-400",
    selisih: "border-rose-200 bg-rose-50/70 hover:border-rose-400",
    empty: "border-line bg-white hover:border-ink-300",
  };

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/kalender?bulan=${prev}`}
              className="rounded-lg border border-line bg-white p-1.5 text-ink-700 transition hover:bg-slate-50"
              aria-label="Bulan sebelumnya"
            >
              <IconChevronLeft size={16} />
            </Link>
            <h3 className="min-w-[9.5rem] text-center text-[1rem] font-extrabold text-ink-900">{monthLabel(data.bulan)}</h3>
            <Link
              href={`/kalender?bulan=${next}`}
              className="rounded-lg border border-line bg-white p-1.5 text-ink-700 transition hover:bg-slate-50"
              aria-label="Bulan berikutnya"
            >
              <IconChevronRight size={16} />
            </Link>
            <Link
              href={`/kalender?bulan=${today.slice(0, 7)}`}
              className="ml-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[0.72rem] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hari ini
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[0.68rem] font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-emerald-300 bg-emerald-100" /> Semua terverifikasi</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-100" /> Ada yang menunggu</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-rose-300 bg-rose-100" /> Ada selisih</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 border-b border-line bg-slate-50/70 px-3 py-2 text-center text-[0.64rem] font-bold uppercase tracking-wide text-slate-500">
          {HARI.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 p-2 sm:gap-2 sm:p-3">
          {cells.map((cell, index) => {
            if (!cell.date) return <div key={`empty-${index}`} className="min-h-[68px] rounded-lg bg-slate-50/40 sm:min-h-[92px]" />;
            const tone = dayTone(cell.data);
            const isToday = cell.date === today;
            const isFuture = cell.date > today;
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => openDay(cell.date!)}
                disabled={isFuture}
                className={cn(
                  "group relative flex min-h-[68px] flex-col rounded-lg border p-1.5 text-left transition sm:min-h-[92px] sm:p-2",
                  toneStyles[tone],
                  isFuture && "cursor-not-allowed opacity-45",
                  isToday && "ring-2 ring-ink-700 ring-offset-1",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("numeric text-[0.7rem] font-bold", isToday ? "text-ink-900" : "text-slate-600")}>
                    {cell.dayNumber}
                  </span>
                  {cell.data && cell.data.jumlah > 0 && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        tone === "lengkap" ? "bg-emerald-500" : tone === "menunggu" ? "bg-amber-400" : "bg-rose-500",
                      )}
                    />
                  )}
                </div>
                {cell.data && cell.data.jumlah > 0 ? (
                  <>
                    <span className="mt-0.5 block text-[0.58rem] font-bold text-ink-800 sm:text-[0.65rem]">
                      {cell.data.jumlah}/{data.totalUnit}
                    </span>
                    <span className="numeric mt-auto hidden text-[0.6rem] font-semibold text-slate-500 sm:block">
                      {rupiahShort(cell.data.total)}
                    </span>
                    <span className="mt-1 flex h-1 overflow-hidden rounded-full bg-white/60">
                      {cell.data.terverifikasi > 0 && (
                        <span className="h-full bg-emerald-500" style={{ width: `${(cell.data.terverifikasi / cell.data.jumlah) * 100}%` }} />
                      )}
                      {cell.data.menunggu > 0 && (
                        <span className="h-full bg-amber-400" style={{ width: `${(cell.data.menunggu / cell.data.jumlah) * 100}%` }} />
                      )}
                      {cell.data.selisih > 0 && (
                        <span className="h-full bg-rose-500" style={{ width: `${(cell.data.selisih / cell.data.jumlah) * 100}%` }} />
                      )}
                    </span>
                  </>
                ) : (
                  <span className="mt-auto text-[0.58rem] text-slate-400">{isFuture ? "" : "Belum ada"}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-slate-50/60 px-4 py-2.5 text-[0.7rem] text-slate-500">
          <span>
            Klik tanggal untuk rincian setoran semua unit · Kapasitas {data.totalUnit} unit (KA, parkir, cafe, booth) per hari
          </span>
          <span className="numeric font-semibold text-ink-800">
            Total bulan ini: {rupiah(data.totals.total)}
          </span>
        </div>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
        title={
          <span className="flex flex-wrap items-center gap-2">
            <IconTrain size={16} className="text-ink-600" />
            Rincian Setoran {selected ? formatTanggal(selected, true) : ""}
          </span>
        }
        subtitle={
          dayData
            ? `${dayData.jumlah}/${data.totalUnit} unit menyetor · ${rupiah(dayData.total)} · ${dayData.terverifikasi} terverifikasi, ${dayData.menunggu} menunggu, ${dayData.selisih} selisih`
            : "Belum ada setoran pada tanggal ini"
        }
        footer={
          selected ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="numeric text-[0.76rem] font-bold text-ink-900">
                Total hari ini: {rupiah(dayData?.total ?? 0)}
              </p>
              <Link
                href={`/verifikasi?dari=${selected}&sampai=${selected}&status=semua`}
                className="rounded-lg bg-ink-800 px-3 py-1.5 text-[0.74rem] font-semibold text-white hover:bg-ink-900"
              >
                Buka di dashboard verifikasi →
              </Link>
            </div>
          ) : null
        }
      >
        {loading && <p className="py-6 text-center text-[0.8rem] text-slate-400">Memuat rincian setoran…</p>}
        {error && <p className="py-6 text-center text-[0.8rem] text-rose-600">{error}</p>}
        {!loading && !error && detail && detail.length === 0 && (
          <p className="py-8 text-center text-[0.8rem] text-slate-400">Tidak ada setoran yang tercatat pada tanggal tersebut.</p>
        )}
        {!loading && detail && detail.length > 0 && (
          <div className="space-y-2">
            {dayData && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-line bg-slate-50 px-2.5 py-2 text-center">
                  <p className="text-[0.6rem] uppercase text-slate-400">Terverifikasi</p>
                  <p className="numeric text-[0.88rem] font-bold text-emerald-600">{dayData.terverifikasi}</p>
                </div>
                <div className="rounded-lg border border-line bg-slate-50 px-2.5 py-2 text-center">
                  <p className="text-[0.6rem] uppercase text-slate-400">Menunggu</p>
                  <p className="numeric text-[0.88rem] font-bold text-amber-600">{dayData.menunggu}</p>
                </div>
                <div className="rounded-lg border border-line bg-slate-50 px-2.5 py-2 text-center">
                  <p className="text-[0.6rem] uppercase text-slate-400">Selisih</p>
                  <p className="numeric text-[0.88rem] font-bold text-rose-600">{dayData.selisih}</p>
                </div>
              </div>
            )}
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {detail.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="grid h-8 w-10 shrink-0 place-items-center rounded-md bg-ink-800 text-[0.6rem] font-bold text-white">
                    {row.nomorUnit}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1 truncate text-[0.78rem] font-semibold text-ink-900">
                      {row.namaUnit} <KategoriBadge kategori={row.kategori} />
                    </p>
                    <p className="truncate text-[0.64rem] text-slate-500">
                      {row.petugas} · Shift {row.shift} · {row.layanan}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="numeric text-[0.78rem] font-bold text-ink-900">{rupiah(Number(row.total))}</p>
                    <p className="numeric text-[0.62rem] text-slate-400">
                      T {rupiahShort(Number(row.tunai))} · N {rupiahShort(Number(row.nonTunai))}
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                    <StatusBadge status={row.status} size="sm" />
                    {row.status === "terverifikasi" ? (
                      <span className="text-[0.6rem] text-emerald-600">{formatWaktu(row.verifiedAt)}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </>
  );
}

export function CalendarLegendHint() {
  return (
    <div className="flex flex-wrap gap-3 text-[0.7rem] text-slate-500">
      <span className="flex items-center gap-1"><IconCheck size={13} className="text-emerald-500" /> Semua terverifikasi</span>
      <span className="flex items-center gap-1"><IconClock size={13} className="text-amber-500" /> Menunggu verifikasi</span>
      <span className="flex items-center gap-1"><IconAlert size={13} className="text-rose-500" /> Selisih / ditolak</span>
      <span className="flex items-center gap-1"><IconX size={13} className="text-slate-400" /> Belum ada setoran</span>
    </div>
  );
}
