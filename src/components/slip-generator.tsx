"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useActor } from "@/components/actor-context";
import { IconAlert, IconCheck, IconPrinter, IconQr, IconSearch, IconShieldCheck } from "@/components/icons";
import { SlipDocument } from "@/components/slip-document";
import { Callout, KategoriBadge, KategoriChips, SectionCard } from "@/components/ui";
import type { SlipRecord } from "@/lib/slip";
import type { UnitRow } from "@/lib/queries";
import { cn, formatTanggal, formatWaktu, kategoriMeta, rupiah, todayISO } from "@/lib/utils";

type VerifiedRow = {
  id: number;
  unitId: number;
  kodeSetoran: string;
  tanggalDinas: string;
  namaUnit: string;
  nomorUnit: string;
  kategori: string;
  layanan: string;
  relasi: string;
  shift: string;
  petugas: string;
  tunai: number;
  nonTunai: number;
  total: number;
  verifikator: string | null;
  verifiedAt: string | null;
};

type HistoryRow = {
  id: number;
  nomorReferensi: string;
  token: string;
  jenis: string;
  periodeMulai: string;
  periodeSelesai: string;
  jumlahTransaksi: number;
  grandTotal: number;
  dicetakOleh: string;
  createdAt: string | Date;
};

const TABS = [
  { value: "harian", label: "Per Tanggal", desc: "Rekap harian seluruh KA" },
  { value: "per_ka", label: "Per Unit / KA", desc: "Rekap periode satu unit" },
  { value: "gabungan", label: "Slip Gabungan", desc: "Pilih data terverifikasi" },
] as const;

const JENIS_LABEL: Record<string, string> = {
  harian: "Per Tanggal",
  per_unit: "Per Unit",
  per_ka: "Per Unit",
  gabungan: "Gabungan",
};

export function SlipGenerator({
  verifiedRows,
  trains,
  history,
  defaultTanggal,
}: {
  verifiedRows: VerifiedRow[];
  trains: UnitRow[];
  history: HistoryRow[];
  defaultTanggal: string;
}) {
  const router = useRouter();
  const { actor } = useActor();
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("harian");
  const [tanggal, setTanggal] = useState(defaultTanggal);
  const [dari, setDari] = useState(defaultTanggal.slice(0, 7) + "-01");
  const [sampai, setSampai] = useState(defaultTanggal);
  const [kaId, setKaId] = useState<string>("");
  const [kategoriTab, setKategoriTab] = useState<string>("semua");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [slip, setSlip] = useState<SlipRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { semua: verifiedRows.length };
    for (const row of verifiedRows) counts[row.kategori] = (counts[row.kategori] ?? 0) + 1;
    return counts;
  }, [verifiedRows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return verifiedRows.filter((row) => {
      if (kategoriTab !== "semua" && row.kategori !== kategoriTab) return false;
      if (tab === "harian" && row.tanggalDinas !== tanggal) return false;
      if (tab === "per_ka") {
        if (!kaId) return false;
        if (row.tanggalDinas < dari || row.tanggalDinas > sampai) return false;
        if (Number(row.unitId) !== Number(kaId)) return false;
      }
      if (term && !`${row.namaUnit} ${row.nomorUnit} ${row.petugas} ${row.kodeSetoran}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [verifiedRows, tab, tanggal, kaId, dari, sampai, q, trains]);

  const shownTotal = shown.reduce((sum, row) => sum + Number(row.total), 0);
  const selectedRows = verifiedRows.filter((row) => selected.includes(row.id));
  const selectedTotal = selectedRows.reduce((sum, row) => sum + Number(row.total), 0);
  const allChecked = shown.length > 0 && shown.every((row) => selected.includes(row.id));

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { dicetakOleh: actor.nama };
      if (tab === "harian") {
        body.jenis = "harian";
        body.tanggal = tanggal;
      } else if (tab === "per_ka") {
        if (!kaId) {
          setError("Pilih kereta api untuk rekap per KA.");
          return;
        }
        body.jenis = "per_unit";
        body.unitId = Number(kaId);
        body.dari = dari;
        body.sampai = sampai;
      } else {
        if (selected.length === 0) {
          setError("Centang minimal satu setoran terverifikasi pada tabel.");
          return;
        }
        body.jenis = "gabungan";
        body.setoranIds = selected;
      }

      const response = await fetch("/api/slip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { ok: boolean; data?: SlipRecord; message?: string };
      if (!response.ok || !payload.ok || !payload.data) {
        setError(payload.message ?? "Gagal menerbitkan slip");
        return;
      }
      setSlip(payload.data);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setBusy(false);
    }
  }

  if (slip) {
    const qrText = `${origin}/validasi/${slip.token}`;
    return (
      <div>
        <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
          <div className="flex items-start gap-2">
            <IconCheck size={16} className="mt-0.5 text-emerald-600" />
            <div>
              <p className="text-[0.8rem] font-bold text-emerald-900">Slip {slip.nomorReferensi} berhasil diterbitkan</p>
              <p className="text-[0.7rem] text-emerald-700">
                {slip.jumlahTransaksi} setoran terverifikasi · total {rupiah(Number(slip.grandTotal))} · token {slip.token}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSlip(null)}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[0.74rem] font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              ← Generator
            </button>
            <Link
              href={`/slip/${slip.token}`}
              target="_blank"
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[0.74rem] font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              Buka versi cetak
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-1.5 text-[0.74rem] font-bold text-white hover:bg-ink-900"
            >
              <IconPrinter size={14} /> Cetak / PDF
            </button>
          </div>
        </div>
        <div className="print-area overflow-x-auto pb-2">
          <SlipDocument slip={slip} qrSrc={`/api/qr?data=${encodeURIComponent(qrText)}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print grid gap-2 sm:grid-cols-3">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={cn(
              "rounded-xl border px-3.5 py-2.5 text-left transition",
              tab === item.value
                ? "border-ink-700 bg-ink-800 text-white shadow-sm"
                : "border-line bg-white text-ink-800 hover:border-ink-300",
            )}
          >
            <span className="block text-[0.8rem] font-bold">{item.label}</span>
            <span className={cn("block text-[0.67rem]", tab === item.value ? "text-white/55" : "text-slate-500")}>{item.desc}</span>
          </button>
        ))}
      </div>

      <div className="no-print grid gap-3 xl:grid-cols-[1fr_20rem]">
        <SectionCard
          title="Parameter Cetak Slip"
          description="Hanya setoran berstatus TERVERIFIKASI yang dapat ditarik"
          bodyClassName="space-y-3"
        >
          {tab === "harian" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="tanggal-slip">Tanggal Rekap</label>
                <input
                  id="tanggal-slip"
                  type="date"
                  className="field"
                  value={tanggal}
                  max={todayISO()}
                  onChange={(event) => setTanggal(event.target.value)}
                />
              </div>
              <div className="rounded-lg border border-line bg-slate-50 px-3 py-2">
                <p className="text-[0.64rem] uppercase tracking-wide text-slate-400">Data tersedia</p>
                <p className="text-[0.85rem] font-bold text-ink-900">
                  {shown.length} KA · {rupiah(shownTotal)}
                </p>
                <p className="text-[0.66rem] text-slate-500">{formatTanggal(tanggal, true)}</p>
              </div>
            </div>
          )}

          {tab === "per_ka" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ka-slip">Pilih Unit / Kereta Api</label>
                <select id="ka-slip" className="field" value={kaId} onChange={(event) => setKaId(event.target.value)}>
                  <option value="">— Pilih dari 63 KA —</option>
                  {trains.map((train) => (
                    <option key={train.id} value={train.id}>
                      KA {train.nomorUnit} · {train.namaUnit} ({train.layanan})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="dari-slip">Periode Mulai</label>
                <input id="dari-slip" type="date" className="field" value={dari} onChange={(event) => setDari(event.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="sampai-slip">Periode Selesai</label>
                <input id="sampai-slip" type="date" className="field" value={sampai} onChange={(event) => setSampai(event.target.value)} />
              </div>
              <div className="sm:col-span-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-[0.75rem]">
                {kaId ? (
                  <>
                    <p className="font-semibold text-ink-900">
                      {shown.length} setoran terverifikasi · {rupiah(shownTotal)}
                    </p>
                    <p className="text-[0.68rem] text-slate-500">
                      {formatTanggal(dari)} — {formatTanggal(sampai)}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500">Pilih unit untuk melihat data periode.</p>
                )}
              </div>
            </div>
          )}

          {tab === "gabungan" && (
            <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-[0.76rem] text-ink-800">
              Centang setoran pada tabel di bawah ({selected.length} dipilih · {rupiah(selectedTotal)}), lalu terbitkan slip
              gabungan.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-3.5 py-2 text-[0.78rem] font-bold text-white shadow-sm hover:bg-ink-900 disabled:opacity-60"
            >
              <IconPrinter size={15} /> {busy ? "Menerbitkan…" : "Terbitkan Slip"}
            </button>
            <p className="text-[0.68rem] text-slate-400">
              Dicetak oleh: <strong className="text-slate-600">{actor.nama}</strong> · Nomor referensi otomatis
            </p>
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[0.75rem] font-medium text-rose-700">
              <IconAlert size={15} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
        </SectionCard>

        <div className="space-y-3">
          <Callout tone="info" title="Kepatuhan cetak">
            Slip hanya menarik data <strong>terverifikasi</strong>. Setoran menunggu atau selisih tidak akan muncul walau
            tanggalnya sama.
          </Callout>
          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">
              <IconQr size={13} /> Validasi dokumen
            </p>
            <p className="mt-1 text-[0.75rem] leading-relaxed text-slate-600">
              Setiap slip memiliki QR &amp; token validasi. Pemindai diarahkan ke halaman publik{" "}
              <span className="rounded bg-slate-100 px-1 font-mono text-[0.68rem]">/validasi/&lt;token&gt;</span> yang menampilkan
              ringkasan resmi slip.
            </p>
          </div>
          <div className="card p-4">
            <p className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">Riwayat slip terakhir</p>
            <ul className="mt-2 space-y-1.5">
              {history.length === 0 && <li className="text-[0.72rem] text-slate-400">Belum ada slip diterbitkan.</li>}
              {history.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 border-b border-dashed border-line pb-1.5 last:border-0">
                  <span className="min-w-0">
                    <span className="numeric block truncate text-[0.68rem] font-semibold text-ink-900">{item.nomorReferensi}</span>
                    <span className="block text-[0.6rem] text-slate-400">
                      {JENIS_LABEL[item.jenis] ?? item.jenis} · {item.jumlahTransaksi} data · {formatWaktu(item.createdAt)}
                    </span>
                  </span>
                  <Link href={`/slip/${item.token}`} className="shrink-0 text-[0.64rem] font-bold text-ink-600 hover:text-ink-900">
                    Buka
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="no-print">
        <KategoriChips value={kategoriTab} onChange={setKategoriTab} counts={categoryCounts} />
      </div>

      <SectionCard
        title={`Sumber Data Terverifikasi (${shown.length})`}
        description="Tabel referensi cetak — hanya status terverifikasi"
        className="no-print"
        bodyClassName="p-0"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Cari KA / petugas"
                className="field w-[11rem] py-1.5 pl-7 text-[0.72rem]"
              />
            </div>
            {tab === "gabungan" && (
              <button
                type="button"
                onClick={() =>
                  setSelected(allChecked ? [] : Array.from(new Set([...selected, ...shown.map((row) => row.id)])))
                }
                className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[0.7rem] font-semibold text-ink-800 hover:bg-slate-50"
              >
                {allChecked ? "Batal pilih" : "Pilih semua"}
              </button>
            )}
          </div>
        }
      >
        {shown.length === 0 ? (
          <div className="px-4 py-10 text-center text-[0.78rem] text-slate-400">
            Tidak ada setoran terverifikasi pada parameter ini.
            <Link href="/verifikasi" className="ml-1 font-semibold text-ink-700 underline-offset-2 hover:underline">
              Verifikasi dulu di dashboard Kasir →
            </Link>
          </div>
        ) : (
          <div className="max-h-[26rem] overflow-auto">
            <table className="w-full min-w-[820px] text-left text-[0.75rem]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[0.62rem] uppercase tracking-wide text-slate-500">
                <tr>
                  {tab === "gabungan" && <th className="w-8 px-3 py-2" />}
                  <th className="px-2 py-2 font-semibold">Tgl Dinas</th>
                  <th className="px-2 py-2 font-semibold">Unit / Sumber</th>
                  <th className="px-2 py-2 font-semibold">Petugas</th>
                  <th className="px-2 py-2 text-right font-semibold">Tunai</th>
                  <th className="px-2 py-2 text-right font-semibold">Non-Tunai</th>
                  <th className="px-2 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold">Verifikator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {shown.map((row) => {
                  const checked = selected.includes(row.id);
                  return (
                    <tr key={row.id} className={cn(checked && "bg-emerald-50/60")}>
                      {tab === "gabungan" && (
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelected((prev) => (prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]))
                            }
                            aria-label={`Pilih ${row.kodeSetoran}`}
                            className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
                          />
                        </td>
                      )}
                      <td className="whitespace-nowrap px-2 py-2 text-slate-600">{formatTanggal(row.tanggalDinas)}</td>
                      <td className="px-2 py-2">
                        <span className="flex flex-wrap items-center gap-1 font-semibold text-ink-900">
                          {row.namaUnit} <KategoriBadge kategori={row.kategori} />
                        </span>
                        <span className="block text-[0.62rem] text-slate-400">
                          {row.kategori === "ka" ? `KA ${row.nomorUnit}` : row.nomorUnit} · {row.relasi}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{row.petugas}</td>
                      <td className="numeric px-2 py-2 text-right text-slate-600">{rupiah(Number(row.tunai))}</td>
                      <td className="numeric px-2 py-2 text-right text-slate-600">{rupiah(Number(row.nonTunai))}</td>
                      <td className="numeric px-2 py-2 text-right font-bold text-ink-900">{rupiah(Number(row.total))}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1 text-[0.68rem] font-medium text-emerald-700">
                          <IconShieldCheck size={12} /> {row.verifikator ?? "—"}
                        </span>
                        <span className="text-[0.6rem] text-slate-400">{formatWaktu(row.verifiedAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-white">
                <tr className="border-t border-line font-bold text-ink-900">
                  <td colSpan={tab === "gabungan" ? 6 : 5} className="px-3 py-2 text-right text-[0.72rem]">
                    Total ({shown.length} setoran)
                  </td>
                  <td className="numeric px-2 py-2 text-right">{rupiah(shownTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
