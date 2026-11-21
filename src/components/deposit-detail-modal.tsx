"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useActor } from "@/components/actor-context";
import { IconAlert, IconCheck, IconEye, IconClock, IconReceipt } from "@/components/icons";
import { Callout, KategoriBadge, Modal, Money, StatusBadge } from "@/components/ui";
import type { DepositRow } from "@/lib/queries";
import { cn, formatTanggal, formatWaktu, kategoriMeta, parseNominal, rupiah } from "@/lib/utils";

type Mode = "detail" | "verifikasi";

export function DepositDetailModal({
  row,
  open,
  onClose,
  mode = "verifikasi",
  onDone,
}: {
  row: DepositRow | null;
  open: boolean;
  onClose: () => void;
  mode?: Mode;
  onDone?: (message: string) => void;
}) {
  const router = useRouter();
  const { actor } = useActor();
  const [panel, setPanel] = useState<"none" | "revisi">("none");
  const [verifikator, setVerifikator] = useState(actor.nama);
  const [jenis, setJenis] = useState<"kurang" | "lebih">("kurang");
  const [nominal, setNominal] = useState("");
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (open) {
      setPanel("none");
      setError(null);
      setNominal("");
      setCatatan("");
      setJenis("kurang");
      setVerifikator(actor.nama);
    }
  }, [open, row?.id, actor.nama]);

  if (!row) return null;
  const buktiSrc = row.buktiData?.startsWith("data:") || row.buktiData?.startsWith("/") ? row.buktiData : null;
  // Setoran "selisih" masih dapat diselesaikan Kasir setelah petugas memperbaiki.
  const dapatVerifikasi = mode === "verifikasi" && row.status !== "terverifikasi";
  const penyelesaianSelisih = row.status === "selisih";

  async function submit(aksi: "setujui" | "revisi") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/setoran/${row!.id}/verifikasi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aksi,
          verifikator,
          catatan,
          jenisSelisih: jenis,
          nominalSelisih: parseNominal(nominal),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Gagal memproses verifikasi");
        return;
      }
      onClose();
      onDone?.(payload.message ?? "Berhasil");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink-800 text-white">
              <IconReceipt size={14} />
            </span>
            {row.namaUnit}
            <KategoriBadge kategori={row.kategori} size="md" />
            <StatusBadge status={row.status} />
          </span>
        }
        subtitle={`${formatTanggal(row.tanggalDinas, true)} · ${row.kodeSetoran} · Shift ${row.shift}`}
      >
        <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-2.5 rounded-xl border border-line bg-slate-50/60 p-3 text-[0.75rem]">
              <div>
                <dt className="text-[0.62rem] font-semibold uppercase tracking-wide text-slate-400">
                  {row.kategori === "ka" ? "Kelas / Relasi" : "Jenis / Lokasi"}
                </dt>
                <dd className="mt-0.5 font-medium text-ink-900">
                  {kategoriMeta(row.kategori).label} · {row.layanan}
                  <span className="block text-[0.68rem] font-normal text-slate-500">
                    {row.kategori === "ka" ? `KA ${row.nomorUnit}` : row.nomorUnit} · {row.relasi}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[0.62rem] font-semibold uppercase tracking-wide text-slate-400">Petugas Penyetor</dt>
                <dd className="mt-0.5 font-medium text-ink-900">
                  {row.petugas}
                  <span className="block text-[0.68rem] font-normal text-slate-500">Input oleh {row.dibuatOleh}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[0.62rem] font-semibold uppercase tracking-wide text-slate-400">Pendapatan Tunai</dt>
                <dd className="mt-0.5"><Money value={Number(row.tunai)} className="font-semibold text-ink-900" /></dd>
              </div>
              <div>
                <dt className="text-[0.62rem] font-semibold uppercase tracking-wide text-slate-400">Non-Tunai (QRIS/EDC)</dt>
                <dd className="mt-0.5"><Money value={Number(row.nonTunai)} className="font-semibold text-ink-900" /></dd>
              </div>
            </dl>

            <div className="rounded-xl bg-gradient-to-br from-ink-800 to-ink-950 px-3.5 py-3 text-white">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/50">Total Setoran</p>
              <p className="numeric mt-0.5 text-[1.4rem] font-extrabold leading-none">{rupiah(Number(row.total))}</p>
              <p className="mt-1 text-[0.64rem] text-white/45">Nominal input petugas — bandingkan dengan bukti setor.</p>
            </div>

            {row.status === "selisih" && (
              <Callout tone="danger" title={`Selisih ${row.jenisSelisih === "lebih" ? "Lebih" : "Kurang"} Setor`}>
                {rupiah(Number(row.nominalSelisih))} — {row.catatanVerifikator ?? "Menunggu perbaikan petugas."}
                <span className="mt-1 block text-[0.66rem] opacity-80">
                  Diverifikasi oleh {row.verifikator ?? "—"} · {formatWaktu(row.verifiedAt)}
                </span>
              </Callout>
            )}

            {row.status === "terverifikasi" && (
              <Callout tone="success" title="Setoran terverifikasi">
                Diverifikasi Kasir <strong>{row.verifikator ?? "—"}</strong> pada {formatWaktu(row.verifiedAt)}.
                {row.catatanVerifikator && <span className="mt-1 block italic">“{row.catatanVerifikator}”</span>}
              </Callout>
            )}

            {row.status === "menunggu" && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[0.72rem] text-amber-800">
                <IconClock size={15} /> Menunggu verifikasi Kasir.
              </div>
            )}

            {penyelesaianSelisih && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-[0.72rem] text-rose-800">
                Kasir dapat <strong>menyelesaikan selisih</strong> ini setelah petugas memperbaiki setoran. Tindakan
                penyelesaian mengubah status menjadi Terverifikasi dan mengunci nominal akhir.
              </div>
            )}

            {dapatVerifikasi && (
              <div className="rounded-xl border border-line p-3">
                <label className="label">Nama Kasir (Verifikator)</label>
                <input
                  className="field"
                  value={verifikator}
                  onChange={(event) => setVerifikator(event.target.value)}
                  placeholder="Nama pemeriksa"
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => submit("setujui")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[0.76rem] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <IconCheck size={15} />{" "}
                    {busy ? "Memproses…" : penyelesaianSelisih ? "Selesaikan Selisih" : "Setujui (Verified)"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPanel(panel === "revisi" ? "none" : "revisi")}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[0.76rem] font-semibold transition",
                      panel === "revisi"
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-line bg-white text-ink-800 hover:bg-slate-50",
                    )}
                  >
                    <IconAlert size={15} /> Revisi / Selisih
                  </button>
                </div>

                {panel === "revisi" && (
                  <div className="mt-3 space-y-2.5 rounded-lg border border-rose-200 bg-rose-50/50 p-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setJenis("kurang")}
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-[0.72rem] font-semibold",
                          jenis === "kurang" ? "border-rose-400 bg-white text-rose-700" : "border-rose-200 bg-white/50 text-slate-500",
                        )}
                      >
                        Kurang Setor
                      </button>
                      <button
                        type="button"
                        onClick={() => setJenis("lebih")}
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-[0.72rem] font-semibold",
                          jenis === "lebih" ? "border-rose-400 bg-white text-rose-700" : "border-rose-200 bg-white/50 text-slate-500",
                        )}
                      >
                        Lebih Setor
                      </button>
                    </div>
                    <div>
                      <label className="label">Nominal Selisih (IDR)</label>
                      <input
                        className="field numeric"
                        inputMode="numeric"
                        value={nominal ? Number(parseNominal(nominal)).toLocaleString("id-ID") : ""}
                        onChange={(event) => setNominal(event.target.value)}
                        placeholder="Contoh: 150.000"
                      />
                    </div>
                    <div>
                      <label className="label">Catatan untuk Petugas</label>
                      <textarea
                        className="field min-h-[64px] resize-y"
                        value={catatan}
                        onChange={(event) => setCatatan(event.target.value)}
                        placeholder="Jelaskan ketidaksesuaian bukti setor…"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submit("revisi")}
                      className="w-full rounded-lg bg-rose-600 px-3 py-2 text-[0.76rem] font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      {busy ? "Mengirim…" : "Kirim Revisi ke Petugas"}
                    </button>
                  </div>
                )}

                {error && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[0.72rem] font-medium text-rose-700">{error}</p>}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[0.68rem] font-bold uppercase tracking-wide text-slate-500">Bukti Setor / Resi</p>
              {buktiSrc && (
                <button
                  type="button"
                  onClick={() => setZoom(true)}
                  className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-ink-600 hover:text-ink-900"
                >
                  <IconEye size={13} /> Perbesar
                </button>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-slate-100">
              {buktiSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={buktiSrc} alt={`Bukti setor ${row.kodeSetoran}`} className="h-[320px] w-full object-contain" />
              ) : (
                <div className="grid h-[320px] place-items-center px-4 text-center">
                  <div>
                    <IconReceipt size={28} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-[0.76rem] font-semibold text-slate-500">Belum ada bukti terlampir</p>
                    <p className="text-[0.68rem] text-slate-400">Minta petugas mengunggah ulang bukti setor.</p>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-1.5 truncate text-[0.65rem] text-slate-400">
              {row.buktiNama ?? "Tidak ada berkas"} · {row.buktiTipe === "demo" ? "Dokumen contoh" : "Unggahan petugas"}
            </p>
            <div className="mt-2 rounded-lg border border-line bg-slate-50 p-2.5 text-[0.68rem] leading-relaxed text-slate-500">
              <strong className="text-ink-900">Checklist verifikasi:</strong> cocokkan nominal tunai + non-tunai dengan bukti,
              pastikan tanggal dinas &amp; unit (KA/parkir/cafe/booth) benar, lalu setujui atau kembalikan dengan catatan
              selisih.
            </div>
          </div>
        </div>
      </Modal>

      {zoom && buktiSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 p-5" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={buktiSrc} alt="Bukti setor diperbesar" className="max-h-[90vh] max-w-3xl rounded-xl bg-white object-contain shadow-float" />
        </div>
      )}
    </>
  );
}
