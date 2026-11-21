"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActor } from "@/components/actor-context";
import {
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconPlus,
  IconSearch,
  IconTrain,
  IconUpload,
  IconX,
} from "@/components/icons";
import { Callout, KategoriChips } from "@/components/ui";
import type { UnitRow } from "@/lib/queries";
import { KATEGORI_META, SHIFT_OPTIONS, cn, formatTanggal, kategoriMeta, parseNominal, rupiah, todayISO } from "@/lib/utils";

type Draft = {
  tanggalDinas: string;
  unitId: number | null;
  shift: string;
  petugas: string;
  tunai: number;
  nonTunai: number;
  catatan: string;
  buktiNama: string | null;
  buktiTipe: string;
  buktiData: string | null;
};

function currencyText(value: number) {
  return value > 0 ? value.toLocaleString("id-ID") : "";
}

async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca berkas"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Berkas bukan gambar yang valid"));
    img.src = dataUrl;
  });

  const maxSize = 1100;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function SetoranForm({
  trains,
  defaultPetugas,
  defaultKaId,
}: {
  trains: UnitRow[];
  defaultPetugas: string;
  defaultKaId?: number;
}) {
  const router = useRouter();
  const { actor } = useActor();
  const [draft, setDraft] = useState<Draft>({
    tanggalDinas: todayISO(),
    unitId: defaultKaId ?? null,
    shift: "Pagi",
    petugas: defaultPetugas,
    tunai: 0,
    nonTunai: 0,
    catatan: "",
    buktiNama: null,
    buktiTipe: "demo",
    buktiData: null,
  });
  const [kaQuery, setKaQuery] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<string>("semua");
  const [kaOpen, setKaOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ kode: string; total: number; nama: string; tanggal: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft((prev) => (prev.petugas ? prev : { ...prev, petugas: actor.nama }));
  }, [actor.nama]);

  const activeUnits = useMemo(() => trains.filter((unit) => unit.statusAktif), [trains]);
  const kategoriCounts = useMemo(() => {
    const counts: Record<string, number> = { semua: activeUnits.length };
    for (const unit of activeUnits) counts[unit.kategori] = (counts[unit.kategori] ?? 0) + 1;
    return counts;
  }, [activeUnits]);
  const filteredUnits = useMemo(() => {
    const term = kaQuery.trim().toLowerCase();
    let list = activeUnits;
    if (kategoriFilter !== "semua") list = list.filter((unit) => unit.kategori === kategoriFilter);
    if (!term) return list;
    return list.filter((unit) =>
      `${unit.nomorUnit} ${unit.namaUnit} ${unit.kodeUnit} ${unit.relasi} ${unit.layanan}`.toLowerCase().includes(term),
    );
  }, [activeUnits, kaQuery, kategoriFilter]);

  const selected = trains.find((train) => train.id === draft.unitId) ?? null;
  const total = draft.tunai + draft.nonTunai;

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Bukti setor harus berupa gambar (JPG/PNG).");
      return;
    }
    if (file.size > 6_000_000) {
      setError("Ukuran berkas maksimal 6 MB sebelum dikompresi.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      setDraft((prev) => ({ ...prev, buktiData: compressed, buktiNama: file.name, buktiTipe: "upload" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses gambar");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!draft.unitId) {
      setError("Pilih unit setoran terlebih dahulu.");
      return;
    }
    if (!draft.petugas.trim()) {
      setError("Nama petugas penyetor wajib diisi.");
      return;
    }
    if (total <= 0) {
      setError("Nominal tunai atau non-tunai harus lebih dari nol.");
      return;
    }

    const buktiData =
      draft.buktiData ??
      `/api/bukti-demo?nomor=${encodeURIComponent(selected?.nomorUnit ?? "1")}&tanggal=${draft.tanggalDinas}&tunai=${draft.tunai}&nontunai=${draft.nonTunai}`;

    setBusy(true);
    try {
      let buktiUrl = buktiData;
      if (draft.buktiData?.startsWith("data:")) {
        try {
          const upload = await fetch("/api/bukti", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl: draft.buktiData, nama: draft.buktiNama }),
          });
          const uploaded = (await upload.json()) as { ok: boolean; url?: string; message?: string };
          if (upload.ok && uploaded.ok && uploaded.url) buktiUrl = uploaded.url;
        } catch {
          /* fallback: bukti contoh */
        }
      }

      const response = await fetch("/api/setoran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggalDinas: draft.tanggalDinas,
          unitId: draft.unitId,
          shift: draft.shift,
          petugas: draft.petugas.trim(),
          tunai: draft.tunai,
          nonTunai: draft.nonTunai,
          buktiData: buktiUrl,
          buktiNama: draft.buktiNama ?? "bukti-contoh.jpg",
          buktiTipe: draft.buktiData ? draft.buktiTipe : "demo",
          catatanPetugas: draft.catatan,
          dibuatOleh: actor.nama,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        data?: { kodeSetoran: string; total: number };
      };
      if (!response.ok || !payload.ok || !payload.data) {
        setError(payload.message ?? "Gagal menyimpan setoran");
        return;
      }
      setSuccess({
        kode: payload.data.kodeSetoran,
        total: Number(payload.data.total),
        nama: selected ? `${selected.namaUnit} (KA ${selected.nomorUnit})` : "—",
        tanggal: draft.tanggalDinas,
      });
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setSuccess(null);
    setDraft({
      tanggalDinas: todayISO(),
      unitId: null,
      shift: "Pagi",
      petugas: actor.nama,
      tunai: 0,
      nonTunai: 0,
      catatan: "",
      buktiNama: null,
      buktiTipe: "demo",
      buktiData: null,
    });
    setKaQuery("");
  }

  if (success) {
    return (
      <div className="card mx-auto max-w-xl animate-pop p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <IconCheck size={28} />
        </span>
        <h3 className="mt-3 text-[1.1rem] font-extrabold text-ink-900">Setoran berhasil dicatat</h3>
        <p className="mt-1 text-[0.8rem] text-slate-500">
          Status awal <strong className="text-amber-600">Menunggu Verifikasi</strong>. Kasir akan memeriksa bukti setor Anda sebelum slip diterbitkan.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-line bg-slate-50 p-3 text-left text-[0.76rem]">
          <div>
            <dt className="text-[0.62rem] uppercase tracking-wide text-slate-400">Kode setoran</dt>
            <dd className="numeric font-semibold text-ink-900">{success.kode}</dd>
          </div>
          <div>
            <dt className="text-[0.62rem] uppercase tracking-wide text-slate-400">Tanggal dinas</dt>
            <dd className="font-semibold text-ink-900">{formatTanggal(success.tanggal)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[0.62rem] uppercase tracking-wide text-slate-400">Kereta api</dt>
            <dd className="font-semibold text-ink-900">{success.nama}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[0.62rem] uppercase tracking-wide text-slate-400">Total setoran</dt>
            <dd className="numeric text-[1.1rem] font-extrabold text-ink-900">{rupiah(success.total)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.76rem] font-semibold text-white hover:bg-ink-900"
          >
            <IconPlus size={15} /> Input lagi
          </button>
          <Link
            href="/setoran"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50"
          >
            <IconSearch size={15} /> Lihat data setoran
          </Link>
          <Link
            href="/verifikasi"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50"
          >
            <IconClock size={15} /> Antrean verifikasi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <div className="card space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tanggal">
              Tanggal Transaksi / Dinas <span className="text-rose-500">*</span>
            </label>
            <input
              id="tanggal"
              type="date"
              className="field"
              max={todayISO()}
              value={draft.tanggalDinas}
              onChange={(event) => update("tanggalDinas", event.target.value)}
              required
            />
            <p className="mt-1 text-[0.66rem] text-slate-400">{formatTanggal(draft.tanggalDinas, true)}</p>
          </div>
          <div>
            <label className="label" htmlFor="shift">
              Shift / Waktu Dinas
            </label>
            <select id="shift" className="field" value={draft.shift} onChange={(event) => update("shift", event.target.value)}>
              {SHIFT_OPTIONS.map((shift) => (
                <option key={shift} value={shift}>
                  Shift {shift}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Searchable dropdown KA */}
        <div className="relative">
          <label className="label" htmlFor="ka-search">
            Pilih Nama KA <span className="text-rose-500">*</span>
            <span className="ml-1 font-normal text-slate-400">({trains.filter((train) => train.statusAktif).length} KA aktif dari 63 master)</span>
          </label>
          <KategoriChips value={kategoriFilter} onChange={setKategoriFilter} counts={kategoriCounts} className="mb-2" />
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border bg-white px-3 py-2 transition",
              kaOpen ? "border-ink-600 ring-2 ring-ink-600/10" : "border-[#d8e0ea]",
            )}
          >
            <IconSearch size={16} className="shrink-0 text-slate-400" />
            <input
              id="ka-search"
              className="min-w-0 flex-1 border-0 bg-transparent text-[0.85rem] text-ink-900 outline-none placeholder:text-slate-400"
              placeholder={selected ? `${selected.nomorUnit} · ${selected.namaUnit}` : "Ketik nama unit / nomor KA…"}
              value={kaQuery}
              onChange={(event) => {
                setKaQuery(event.target.value);
                setKaOpen(true);
              }}
              onFocus={() => setKaOpen(true)}
              autoComplete="off"
            />
            <button type="button" onClick={() => setKaOpen((value) => !value)} className="text-slate-400">
              <IconChevronDown size={16} />
            </button>
          </div>

          {kaOpen && (
            <>
              <button type="button" className="fixed inset-0 z-20 cursor-default" aria-label="Tutup pilihan" onClick={() => setKaOpen(false)} />
              <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-[17rem] overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-float">
                {filteredUnits.length === 0 && (
                  <p className="px-3 py-4 text-center text-[0.76rem] text-slate-400">Unit tidak ditemukan.</p>
                )}
                {filteredUnits.map((train) => (
                  <button
                    key={train.id}
                    type="button"
                    onClick={() => {
                      update("unitId", train.id);
                      setKaQuery("");
                      setKaOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50",
                      draft.unitId === train.id && "bg-ink-50",
                    )}
                  >
                    <span className="grid h-7 w-10 shrink-0 place-items-center rounded-md bg-ink-800 text-[0.62rem] font-bold text-white">
                      {train.nomorUnit}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.78rem] font-semibold text-ink-900">{train.namaUnit}</span>
                      <span className="block truncate text-[0.64rem] text-slate-500">
                        {train.layanan} · {train.relasi}
                      </span>
                    </span>
                    <span className="numeric shrink-0 text-[0.6rem] text-slate-400">{train.kodeUnit}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {selected && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-2">
              <IconTrain size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1 text-[0.72rem]">
                <p className="font-bold text-emerald-900">
                  {selected.namaUnit} {selected.kategori === "ka" ? `· KA ${selected.nomorUnit}` : `· ${selected.nomorUnit}`}
                </p>
                <p className="text-emerald-700">
                  {kategoriMeta(selected.kategori).label} · {selected.layanan} · {selected.relasi}
                </p>
              </div>
              <button
                type="button"
                onClick={() => update("unitId", null)}
                className="rounded p-0.5 text-emerald-700 hover:bg-emerald-100"
                aria-label="Hapus pilihan"
              >
                <IconX size={14} />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="petugas">
            Shift / Sales / Crew Penyetor <span className="text-rose-500">*</span>
          </label>
          <input
            id="petugas"
            className="field"
            value={draft.petugas}
            onChange={(event) => update("petugas", event.target.value)}
            placeholder="Nama Sales / Crew penyetor"
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tunai">
              Pendapatan Tunai / Cash (IDR)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.75rem] font-semibold text-slate-400">
                Rp
              </span>
              <input
                id="tunai"
                className="field numeric pl-9 text-right font-semibold"
                inputMode="numeric"
                value={currencyText(draft.tunai)}
                onChange={(event) => update("tunai", parseNominal(event.target.value))}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="nontunai">
              Non-Tunai / QRIS / EDC (IDR)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.75rem] font-semibold text-slate-400">
                Rp
              </span>
              <input
                id="nontunai"
                className="field numeric pl-9 text-right font-semibold"
                inputMode="numeric"
                value={currencyText(draft.nonTunai)}
                onChange={(event) => update("nonTunai", parseNominal(event.target.value))}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label">Bukti Setor / Foto Resi</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />
          {draft.buktiData && draft.buktiData.startsWith("data:") ? (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-slate-50 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.buktiData} alt="Pratinjau bukti" className="h-16 w-16 rounded-lg border border-line object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.76rem] font-semibold text-ink-900">{draft.buktiNama}</p>
                <p className="text-[0.66rem] text-emerald-600">Gambar siap diunggah (dikompres otomatis)</p>
              </div>
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, buktiData: null, buktiNama: null, buktiTipe: "demo" }))}
                className="rounded-lg border border-line bg-white p-1.5 text-slate-400 hover:text-rose-600"
              >
                <IconX size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#cfd9e6] bg-slate-50/60 px-4 py-5 text-center transition hover:border-ink-400 hover:bg-slate-50"
            >
              <IconUpload size={20} className="text-slate-400" />
              <span className="text-[0.76rem] font-semibold text-ink-800">
                {uploading ? "Memproses gambar…" : "Klik untuk unggah foto resi / bukti setor"}
              </span>
              <span className="text-[0.66rem] text-slate-400">JPG/PNG maks 6 MB · otomatis dikompres</span>
            </button>
          )}
          {!draft.buktiData && (
            <p className="mt-1.5 text-[0.66rem] text-slate-400">
              Tidak punya berkas? Sistem akan melampirkan <strong>bukti contoh</strong> untuk keperluan simulasi.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="catatan">
            Catatan Petugas (opsional)
          </label>
          <textarea
            id="catatan"
            className="field min-h-[62px] resize-y"
            value={draft.catatan}
            onChange={(event) => update("catatan", event.target.value)}
            placeholder="Contoh: setoran shift pagi, uang receh dipisah."
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[0.75rem] font-medium text-rose-700">
            <IconAlert size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.68rem] text-slate-400">
            Status awal otomatis <strong className="text-amber-600">Menunggu Verifikasi</strong>.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-slate-500 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-4 py-2 text-[0.78rem] font-bold text-white shadow-sm transition hover:bg-ink-900 disabled:opacity-60"
            >
              <IconCheck size={15} /> {busy ? "Menyimpan…" : "Simpan Setoran"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="animate-rise sticky top-[5.2rem] overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 to-ink-950 p-4 text-white shadow-card">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-brand-300">Total setoran</p>
          <p className="numeric mt-1 text-[1.7rem] font-extrabold leading-none">{rupiah(total)}</p>
          <p className="mt-1 text-[0.66rem] text-white/45">Otomatis dari tunai + non-tunai</p>

          <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-[0.74rem]">
            <div className="flex justify-between">
              <span className="text-white/55">Tunai / cash</span>
              <span className="numeric font-semibold">{rupiah(draft.tunai)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">Non-tunai (QRIS/EDC)</span>
              <span className="numeric font-semibold">{rupiah(draft.nonTunai)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <span className="text-white/55">Shift</span>
              <span className="font-semibold">{draft.shift}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">Tanggal dinas</span>
              <span className="font-semibold">{formatTanggal(draft.tanggalDinas)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/55">Kereta api</span>
              <span className="truncate text-right font-semibold">
                {selected ? `${kategoriMeta(selected.kategori).singkat} ${selected.nomorUnit}` : "Belum dipilih"}
              </span>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-white/[0.07] p-2.5 text-[0.66rem] leading-relaxed text-white/60">
            Pastikan nominal tunai &amp; non-tunai sesuai dengan rekap loket/outlet dan bukti resi. Data terkunci per unit per
            tanggal dinas.
          </div>
        </div>

        <Callout tone="warning" title="Perhatian">
          Satu unit (KA / parkir / cafe / booth) hanya boleh memiliki satu setoran per tanggal dinas. Jika sudah ada,
          perbaiki data lama atau hubungi Kasir.
        </Callout>
      </div>
    </form>
  );
}
