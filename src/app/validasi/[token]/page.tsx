import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCheck, IconPrinter, IconQr, IconShieldCheck, IconTrain } from "@/components/icons";
import { getSlipByToken } from "@/lib/queries";
import type { SlipSnapshot } from "@/lib/slip";
import { SLIP_JENIS_LABEL } from "@/lib/slip";
import { formatTanggal, formatWaktu, kategoriMeta, rupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ValidasiSlipPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const slip = await getSlipByToken(token);
  if (!slip) notFound();

  const headerBag = await headers();
  const host = headerBag.get("host") ?? "localhost:3000";
  const protocol = headerBag.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const snapshot = slip.snapshot as SlipSnapshot;
  const validationUrl = `${protocol}://${host}/validasi/${slip.token}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="animate-rise overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-ink-950 p-5 text-white shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-wide text-emerald-300">
              <IconShieldCheck size={13} /> Slip terverifikasi &amp; valid
            </p>
            <h1 className="mt-2 text-[1.25rem] font-extrabold leading-tight sm:text-[1.5rem]">
              Validasi Slip Setoran Pendapatan KA
            </h1>
            <p className="numeric mt-1 text-[0.8rem] text-brand-200">{slip.nomorReferensi}</p>
            <p className="mt-1 max-w-md text-[0.74rem] leading-relaxed text-white/55">
              Dokumen ini diterbitkan dari data setoran berstatus terverifikasi pada SIVERA. Pindai QR atau cocokkan token untuk
              memastikan keaslian.
            </p>
          </div>
          <div className="rounded-xl bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr?data=${encodeURIComponent(validationUrl)}`} alt="QR validasi slip" className="h-24 w-24" />
            <p className="mt-1 text-center text-[0.52rem] font-semibold uppercase tracking-wide text-slate-400">Scan validasi</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-[0.72rem] sm:grid-cols-4">
          <div>
            <p className="text-[0.6rem] uppercase tracking-wide text-white/40">Unit</p>
            <p className="mt-0.5 font-semibold leading-snug">{snapshot.unit.namaUnit}</p>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase tracking-wide text-white/40">Jenis / Periode</p>
            <p className="mt-0.5 font-semibold">
              {SLIP_JENIS_LABEL[slip.jenis] ?? slip.jenis}
              <span className="block text-[0.66rem] font-normal text-white/50">
                {formatTanggal(slip.periodeMulai)} — {formatTanggal(slip.periodeSelesai)}
              </span>
            </p>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase tracking-wide text-white/40">Diterbitkan</p>
            <p className="mt-0.5 font-semibold">{formatWaktu(slip.createdAt)}</p>
            <p className="text-[0.66rem] text-white/50">oleh {slip.dicetakOleh}</p>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase tracking-wide text-white/40">Token</p>
            <p className="numeric mt-0.5 truncate font-mono text-[0.7rem] font-semibold">{slip.token}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[0.64rem] font-bold uppercase tracking-wide text-slate-400">Grand Total</p>
          <p className="numeric mt-1 text-[1.05rem] font-extrabold text-ink-900">{rupiah(Number(slip.grandTotal))}</p>
          <p className="mt-0.5 text-[0.66rem] text-slate-500">Terverifikasi penuh</p>
        </div>
        <div className="card p-4">
          <p className="text-[0.64rem] font-bold uppercase tracking-wide text-slate-400">Jumlah Setoran</p>
          <p className="numeric mt-1 text-[1.05rem] font-extrabold text-ink-900">{slip.jumlahTransaksi} data</p>
          <p className="mt-0.5 text-[0.66rem] text-slate-500">{snapshot.rows.length} baris rincian</p>
        </div>
        <div className="card p-4">
          <p className="text-[0.64rem] font-bold uppercase tracking-wide text-slate-400">Integritas</p>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[0.7rem] font-bold text-emerald-700 ring-1 ring-emerald-200">
            <IconCheck size={13} /> Cocok dengan arsip
          </p>
          <p className="mt-1 text-[0.66rem] text-slate-500">Snapshot tersimpan saat cetak</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-1.5 text-[0.86rem] font-bold text-ink-900">
            <IconTrain size={15} className="text-ink-600" /> Rincian Setoran Terverifikasi
          </h2>
          <span className="text-[0.66rem] text-slate-400">{slip.jumlahTransaksi} baris</span>
        </div>
        <div className="max-h-[22rem] overflow-auto">
          <table className="w-full min-w-[560px] text-left text-[0.74rem]">
            <thead className="sticky top-0 bg-slate-50 text-[0.62rem] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Tanggal</th>
                <th className="px-2 py-2 font-semibold">Unit / KA</th>
                <th className="px-2 py-2 font-semibold">Petugas</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
                <th className="px-3 py-2 font-semibold">Verifikator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {snapshot.rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatTanggal(row.tanggalDinas)}</td>
                  <td className="px-2 py-2">
                    <span className="font-semibold text-ink-900">{row.namaUnit}</span>
                    <span className="ml-1 text-[0.62rem] text-slate-400">
                      {row.kategori === "ka" ? `KA ${row.nomorUnit}` : `${kategoriMeta(row.kategori).singkat} ${row.nomorUnit}`}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-600">{row.petugas}</td>
                  <td className="numeric px-2 py-2 text-right font-semibold text-ink-900">{rupiah(Number(row.total))}</td>
                  <td className="px-3 py-2 text-[0.68rem] text-emerald-700">{row.verifikator ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line bg-slate-50/70 px-4 py-3">
          <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-slate-400">Terbilang</p>
          <p className="text-[0.78rem] font-bold italic text-ink-900">{slip.terbilang}</p>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-2 rounded-xl border border-dashed border-line bg-white/70 px-4 py-3 sm:flex-row sm:items-center">
        <p className="flex items-center gap-1.5 text-[0.72rem] text-slate-500">
          <IconQr size={14} /> Token unik slip: <span className="font-mono font-semibold text-ink-800">{slip.token}</span>
        </p>
        <div className="flex gap-2">
          <Link
            href={`/slip/${slip.token}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[0.72rem] font-semibold text-ink-800 hover:bg-slate-50"
          >
            <IconPrinter size={14} /> Lihat slip lengkap
          </Link>
          <Link href="/slip" className="rounded-lg bg-ink-800 px-3 py-1.5 text-[0.72rem] font-semibold text-white hover:bg-ink-900">
            Generator slip
          </Link>
        </div>
      </div>
    </div>
  );
}
