"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useActor } from "@/components/actor-context";
import {
  IconAlert,
  IconCamera,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconMobile,
  IconSearch,
  IconTrain,
  IconX,
} from "@/components/icons";
import type { UnitRow } from "@/lib/queries";
import { KATEGORI_META, SHIFT_OPTIONS, cn, formatTanggal, formatJam, kategoriMeta, parseNominal, rupiah, statusMeta, todayISO } from "@/lib/utils";

const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000];

type MyRow = {
  id: number;
  kodeSetoran: string;
  namaUnit: string;
  nomorUnit: string;
  shift: string;
  petugas: string;
  total: number;
  status: string;
  createdAt: string | Date;
};

async function compress(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca berkas"));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Berkas bukan gambar valid"));
    img.src = dataUrl;
  });
  const max = 1000;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.68);
}

export function CrewMobileForm({
  trains,
  todayRows,
}: {
  trains: UnitRow[];
  todayRows: MyRow[];
}) {
  const router = useRouter();
  const { actor } = useActor();
  const [tanggal, setTanggal] = useState(todayISO());
  const [shift, setShift] = useState<string>("Pagi");
  const [selected, setSelected] = useState<UnitRow | null>(null);
  const [keretaOpen, setKeretaOpen] = useState(false);
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState<string>("semua");
  const [tunai, setTunai] = useState(0);
  const [nonTunai, setNonTunai] = useState(0);
  const [bukti, setBukti] = useState<{ data: string; nama: string } | null>(null);
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ kode: string; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const aktifUnits = useMemo(() => trains.filter((unit) => unit.statusAktif), [trains]);
  const kategoriCounts = useMemo(() => {
    const counts: Record<string, number> = { semua: aktifUnits.length };
    for (const unit of aktifUnits) counts[unit.kategori] = (counts[unit.kategori] ?? 0) + 1;
    return counts;
  }, [aktifUnits]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = aktifUnits;
    if (kategori !== "semua") list = list.filter((unit) => unit.kategori === kategori);
    if (!term) return list;
    return list.filter((unit) =>
      `${unit.nomorUnit} ${unit.namaUnit} ${unit.relasi} ${unit.kodeUnit}`.toLowerCase().includes(term),
    );
  }, [aktifUnits, q, kategori]);

  const total = tunai + nonTunai;
  const mine = todayRows.filter((row) => row.petugas.toLowerCase() === actor.nama.toLowerCase());

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Bukti harus berupa foto (JPG/PNG).");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const data = await compress(file);
      setBukti({ data, nama: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses foto");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    if (!selected) {
      setError("Pilih unit setoran dulu ya.");
      return;
    }
    if (total <= 0) {
      setError("Nominal setoran belum diisi.");
      return;
    }
    setBusy(true);
    try {
      let buktiData =
        bukti?.data ??
        `/api/bukti-demo?nomor=${selected.nomorUnit}&tanggal=${tanggal}&tunai=${tunai}&nontunai=${nonTunai}`;
      if (bukti?.data) {
        try {
          const upload = await fetch("/api/bukti", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl: bukti.data, nama: bukti.nama }),
          });
          const uploaded = (await upload.json()) as { ok: boolean; url?: string };
          if (upload.ok && uploaded.ok && uploaded.url) buktiData = uploaded.url;
        } catch {
          /* fallback ke data URL */
        }
      }

      const response = await fetch("/api/setoran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggalDinas: tanggal,
          unitId: selected.id,
          shift,
          petugas: actor.nama,
          tunai,
          nonTunai,
          buktiData,
          buktiNama: bukti?.nama ?? "foto-crew.jpg",
          buktiTipe: bukti ? "upload" : "demo",
          catatanPetugas: catatan,
          dibuatOleh: actor.nama,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        data?: { kodeSetoran: string; total: number };
      };
      if (!response.ok || !payload.ok || !payload.data) {
        setError(payload.message ?? "Gagal mengirim setoran");
        return;
      }
      setDone({ kode: payload.data.kodeSetoran, total: Number(payload.data.total) });
      setSelected(null);
      setTunai(0);
      setNonTunai(0);
      setBukti(null);
      setCatatan("");
      router.refresh();
    } catch {
      setError("Jaringan bermasalah. Coba kirim ulang.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pb-28 lg:max-w-lg">
      {/* Header mobile */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-ink-950 p-4 text-white shadow-card">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand-400/25 blur-2xl" />
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-brand-200">
            <IconMobile size={12} /> Mode Crew · HP
          </span>
          <span className="numeric text-[0.66rem] text-white/50">{formatTanggal(tanggal, true)}</span>
        </div>
        <p className="mt-2 text-[1.08rem] font-extrabold leading-tight">{actor.nama}</p>
        <p className="text-[0.7rem] text-white/55">Input setoran dari atas KA atau outlet — cukup 3 langkah.</p>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg bg-white/[0.07] px-1.5 py-1.5">
            <p className="text-[0.55rem] uppercase text-white/45">Setoran saya</p>
            <p className="numeric text-[0.85rem] font-bold">{mine.length}</p>
          </div>
          <div className="rounded-lg bg-white/[0.07] px-1.5 py-1.5">
            <p className="text-[0.55rem] uppercase text-white/45">Terverifikasi</p>
            <p className="numeric text-[0.85rem] font-bold text-emerald-300">
              {mine.filter((row) => row.status === "terverifikasi").length}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.07] px-1.5 py-1.5">
            <p className="text-[0.55rem] uppercase text-white/45">Menunggu</p>
            <p className="numeric text-[0.85rem] font-bold text-brand-200">
              {mine.filter((row) => row.status === "menunggu").length}
            </p>
          </div>
        </div>
      </div>

      {done && (
        <div className="mt-3 animate-pop rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
          <p className="flex items-center gap-1.5 text-[0.82rem] font-bold text-emerald-800">
            <IconCheck size={16} /> Setoran terkirim!
          </p>
          <p className="mt-0.5 text-[0.72rem] text-emerald-700">
            {done.kode} · {rupiah(done.total)} · menunggu verifikasi kasir.
          </p>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-[0.76rem] font-bold text-white"
          >
            Input setoran lagi
          </button>
        </div>
      )}

      {/* STEP 1 */}
      <div className="card mt-3 p-3.5">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-ink-800 text-[0.62rem] font-bold text-white">1</span>
          <p className="text-[0.8rem] font-bold text-ink-900">Pilih Unit Setoran</p>
        </div>

        <button
          type="button"
          onClick={() => setKeretaOpen(true)}
          className="mt-2.5 flex w-full items-center gap-2.5 rounded-xl border border-line bg-slate-50 px-3 py-3 text-left transition active:scale-[0.99]"
        >
          <span className="grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-ink-800 text-[0.72rem] font-bold text-white">
            {selected ? (selected.kategori === "ka" ? selected.nomorUnit : selected.nomorUnit) : <IconTrain size={18} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.86rem] font-bold text-ink-900">
              {selected ? selected.namaUnit : "Ketuk untuk pilih unit"}
            </span>
            <span className="block truncate text-[0.68rem] text-slate-500">
              {selected ? `${kategoriMeta(selected.kategori).label} · ${selected.layanan} · ${selected.relasi}` : "63 KA + 13 Parkir + 2 Cafe + Booth"}
            </span>
          </span>
          <IconChevronDown size={18} className="shrink-0 text-slate-400" />
        </button>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="crew-tanggal">Tanggal Dinas</label>
            <input
              id="crew-tanggal"
              type="date"
              className="field py-2.5"
              value={tanggal}
              max={todayISO()}
              onChange={(event) => setTanggal(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="crew-shift">Shift</label>
            <select id="crew-shift" className="field py-2.5" value={shift} onChange={(event) => setShift(event.target.value)}>
              {SHIFT_OPTIONS.map((option) => (
                <option key={option} value={option}>Shift {option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="card mt-3 p-3.5">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-ink-800 text-[0.62rem] font-bold text-white">2</span>
          <p className="text-[0.8rem] font-bold text-ink-900">Nominal Setoran</p>
        </div>

        <div className="mt-2.5">
          <label className="label" htmlFor="crew-tunai">Tunai / Cash</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.8rem] font-bold text-slate-400">Rp</span>
            <input
              id="crew-tunai"
              className="field numeric py-3 pl-9 text-right text-[1rem] font-bold"
              inputMode="numeric"
              value={tunai ? tunai.toLocaleString("id-ID") : ""}
              onChange={(event) => setTunai(parseNominal(event.target.value))}
              placeholder="0"
            />
          </div>
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setTunai((prev) => prev + amount)}
                className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-ink-700 active:bg-ink-50"
              >
                +{amount / 1000}rb
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTunai(0)}
              className="shrink-0 rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-500"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-3">
          <label className="label" htmlFor="crew-nontunai">Non-Tunai / QRIS / EDC</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.8rem] font-bold text-slate-400">Rp</span>
            <input
              id="crew-nontunai"
              className="field numeric py-3 pl-9 text-right text-[1rem] font-bold"
              inputMode="numeric"
              value={nonTunai ? nonTunai.toLocaleString("id-ID") : ""}
              onChange={(event) => setNonTunai(parseNominal(event.target.value))}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* STEP 3 */}
      <div className="card mt-3 p-3.5">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-ink-800 text-[0.62rem] font-bold text-white">3</span>
          <p className="text-[0.8rem] font-bold text-ink-900">Foto Bukti Setor</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
        {bukti ? (
          <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bukti.data} alt="Bukti setor" className="h-16 w-16 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.74rem] font-semibold text-emerald-900">{bukti.nama}</p>
              <p className="text-[0.64rem] text-emerald-700">Foto siap dikirim</p>
            </div>
            <button type="button" onClick={() => setBukti(null)} className="rounded-lg bg-white p-1.5 text-slate-400">
              <IconX size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#cfd9e6] bg-slate-50 py-4 text-[0.78rem] font-bold text-ink-800 active:bg-slate-100"
          >
            <IconCamera size={20} className="text-ink-600" />
            {uploading ? "Memproses foto…" : "Ambil Foto / Pilih dari Galeri"}
          </button>
        )}
        <input
          className="field mt-2.5 py-2.5 text-[0.78rem]"
          value={catatan}
          onChange={(event) => setCatatan(event.target.value)}
          placeholder="Catatan (opsional), mis. shift pagi"
        />
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[0.76rem] font-medium text-rose-700">
          <IconAlert size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Riwayat saya hari ini */}
      <div className="card mt-3 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <p className="text-[0.78rem] font-bold text-ink-900">Setoran Saya</p>
          <Link href="/setoran" className="text-[0.66rem] font-semibold text-ink-600">Semua →</Link>
        </div>
        <ul className="divide-y divide-line/70">
          {mine.length === 0 && (
            <li className="px-3.5 py-4 text-center text-[0.72rem] text-slate-400">
              Belum ada setoran hari ini atas nama {actor.nama}.
            </li>
          )}
          {mine.map((row) => (
            <li key={row.id} className="flex items-center gap-2 px-3.5 py-2.5">
              <span className="grid h-8 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-[0.62rem] font-bold text-ink-800">
                {row.nomorUnit}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.76rem] font-semibold text-ink-900">{row.namaUnit}</p>
                <p className="text-[0.62rem] text-slate-500">
                  Shift {row.shift} · {formatJam(row.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="numeric text-[0.76rem] font-bold text-ink-900">{rupiah(Number(row.total))}</p>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.58rem] font-semibold", statusMeta(row.status).badge)}>
                  {statusMeta(row.status).short}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Sticky submit */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-2.5 backdrop-blur-md lg:pl-[17.5rem]">
        <div className="mx-auto flex max-w-md items-center gap-3 lg:max-w-lg">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-400">Total setoran</p>
            <p className="numeric truncate text-[1.05rem] font-extrabold leading-tight text-ink-900">{rupiah(total)}</p>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={busy || total <= 0 || !selected}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink-800 px-4 py-3 text-[0.82rem] font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40"
          >
            <IconCheck size={16} /> {busy ? "Mengirim…" : "Kirim Setoran"}
          </button>
        </div>
      </div>

      {/* Bottom sheet pilih KA */}
      {keretaOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink-950/50 backdrop-blur-sm">
          <button className="flex-1" aria-label="Tutup" onClick={() => setKeretaOpen(false)} />
          <div className="max-h-[78vh] animate-pop rounded-t-2xl bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-[0.86rem] font-bold text-ink-900">Pilih Unit Setoran</p>
              <button onClick={() => setKeretaOpen(false)} className="rounded-lg p-1 text-slate-400"><IconX size={18} /></button>
            </div>
            <div className="px-3 py-2">
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
                {["semua", "ka", "parkir", "cafe", "booth"].map((key) => {
                  const active = kategori === key;
                  const label = key === "semua" ? "Semua" : KATEGORI_META[key as keyof typeof KATEGORI_META].label;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setKategori(key)}
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold",
                        active ? "border-ink-700 bg-ink-800 text-white" : "border-line bg-white text-slate-600",
                      )}
                    >
                      {label}
                      <span className={cn("ml-1 numeric text-[0.6rem]", active ? "text-white/60" : "text-slate-400")}>
                        {kategoriCounts[key] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <IconSearch size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari nama unit / nomor"
                  className="field py-2.5 pl-8"
                />
              </div>
            </div>
            <ul className="max-h-[52vh] overflow-y-auto px-2 pb-4">
              {filtered.map((train) => (
                <li key={train.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(train);
                      setKeretaOpen(false);
                      setQ("");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left active:bg-slate-100"
                  >
                    <span className="grid h-9 w-11 shrink-0 place-items-center rounded-lg bg-ink-50 text-[0.68rem] font-bold text-ink-800">
                      {train.nomorUnit}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.82rem] font-semibold text-ink-900">{train.namaUnit}</span>
                      <span className="block truncate text-[0.66rem] text-slate-500">{train.layanan} · {train.relasi}</span>
                    </span>
                    {selected?.id === train.id && <IconCheck size={16} className="text-emerald-600" />}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="py-6 text-center text-[0.76rem] text-slate-400">Unit tidak ditemukan.</li>}
            </ul>
          </div>
        </div>
      )}

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[0.64rem] text-slate-400">
        <IconClock size={12} /> Setoran KA, parkir, cafe &amp; booth langsung masuk antrean verifikasi Kasir.
      </p>
    </div>
  );
}
