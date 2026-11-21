"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useActor } from "@/components/actor-context";
import { DepositDetailModal } from "@/components/deposit-detail-modal";
import { IconAlert, IconCheck, IconEye, IconShieldCheck, IconX } from "@/components/icons";
import { EmptyState, KategoriBadge, StatusBadge } from "@/components/ui";
import type { DepositRow } from "@/lib/queries";
import { cn, formatTanggal, formatWaktu, kategoriMeta, rupiah, unitShort } from "@/lib/utils";

export function DepositTable({
  rows,
  mode = "data",
  canVerify = true,
  emptyTitle = "Belum ada setoran",
  emptyDescription,
}: {
  rows: DepositRow[];
  mode?: "data" | "verifikasi";
  canVerify?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const router = useRouter();
  const { actor } = useActor();
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<DepositRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const bolehVerifikasi = canVerify && (actor.role === "kasir" || actor.role === "admin");

  const pendingRows = useMemo(() => rows.filter((row) => row.status === "menunggu"), [rows]);
  const selectedRows = useMemo(() => rows.filter((row) => selected.includes(row.id)), [rows, selected]);
  const selectedTotal = selectedRows.reduce((sum, row) => sum + Number(row.total), 0);
  const allSelected = pendingRows.length > 0 && pendingRows.every((row) => selected.includes(row.id));

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  }

  function toggleAll() {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(pendingRows.map((row) => row.id));
    }
  }

  async function bulkVerify() {
    if (selected.length === 0) return;
    const konfirmasi = window.confirm(
      `Setujui ${selected.length} setoran senilai ${rupiah(selectedTotal)} sebagai TERVERIFIKASI?\nVerifikator: ${actor.nama}`,
    );
    if (!konfirmasi) return;
    setBusy(true);
    try {
      const response = await fetch("/api/setoran/verifikasi-massal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, verifikator: actor.nama }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; count?: number };
      if (!response.ok || !payload.ok) {
        setToast({ tone: "danger", text: payload.message ?? "Gagal verifikasi massal" });
        return;
      }
      setToast({ tone: "success", text: `${payload.count} setoran berhasil diverifikasi oleh ${actor.nama}.` });
      setSelected([]);
      router.refresh();
    } catch {
      setToast({ tone: "danger", text: "Terjadi kesalahan jaringan" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {toast && (
        <div
          className={cn(
            "mb-3 flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-[0.76rem] font-medium",
            toast.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          <span className="flex items-center gap-1.5">
            {toast.tone === "success" ? <IconCheck size={15} /> : <IconAlert size={15} />}
            {toast.text}
          </span>
          <button onClick={() => setToast(null)} className="rounded p-0.5 hover:bg-white/50">
            <IconX size={14} />
          </button>
        </div>
      )}

      {bolehVerifikasi && selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-2.5">
          <div className="text-[0.76rem] text-ink-800">
            <span className="font-bold">{selected.length} setoran</span> dipilih · total{" "}
            <span className="numeric font-bold">{rupiah(selectedTotal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[0.72rem] font-semibold text-slate-500 hover:bg-slate-50"
            >
              Bersihkan
            </button>
            <button
              type="button"
              onClick={bulkVerify}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[0.72rem] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <IconShieldCheck size={14} /> {busy ? "Memproses…" : `Verifikasi Massal (${selected.length})`}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} icon={<IconCheck size={20} />} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[0.76rem]">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-[0.63rem] uppercase tracking-wide text-slate-500">
                {bolehVerifikasi && (
                  <th className="w-9 px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua setoran menunggu"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={pendingRows.length === 0}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-emerald-600"
                    />
                  </th>
                )}
                <th className="px-2 py-2 font-semibold">Tgl Dinas</th>
                <th className="px-2 py-2 font-semibold">Unit / Sumber</th>
                <th className="px-2 py-2 font-semibold">Petugas / Shift</th>
                <th className="px-2 py-2 text-right font-semibold">Tunai</th>
                <th className="px-2 py-2 text-right font-semibold">Non-Tunai</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Verifikator</th>
                <th className="px-3 py-2 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {rows.map((row) => {
                const selectable = bolehVerifikasi && row.status === "menunggu";
                const isSelected = selected.includes(row.id);
                return (
                  <tr key={row.id} className={cn("transition", isSelected ? "bg-emerald-50/50" : "hover:bg-slate-50/70")}>
                    {bolehVerifikasi && (
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Pilih setoran ${row.kodeSetoran}`}
                          checked={isSelected}
                          disabled={!selectable}
                          onChange={() => toggle(row.id)}
                          className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-30"
                        />
                      </td>
                    )}
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <span className="font-medium text-ink-900">{formatTanggal(row.tanggalDinas)}</span>
                      <span className="numeric block text-[0.62rem] text-slate-400">{row.kodeSetoran}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="flex flex-wrap items-center gap-1 font-semibold text-ink-900">
                        {row.namaUnit}
                        <KategoriBadge kategori={row.kategori} />
                      </span>
                      <span className="block text-[0.64rem] text-slate-500">
                        {row.kategori === "ka" ? `KA ${row.nomorUnit}` : row.nomorUnit} · {row.layanan} · {row.relasi}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="block text-slate-700">{row.petugas}</span>
                      <span className="block text-[0.64rem] text-slate-400">Shift {row.shift}</span>
                    </td>
                    <td className="numeric px-2 py-2.5 text-right text-slate-600">{rupiah(Number(row.tunai))}</td>
                    <td className="numeric px-2 py-2.5 text-right text-slate-600">{rupiah(Number(row.nonTunai))}</td>
                    <td className="numeric px-2 py-2.5 text-right font-bold text-ink-900">{rupiah(Number(row.total))}</td>
                    <td className="px-2 py-2.5"><StatusBadge status={row.status} size="sm" /></td>
                    <td className="px-2 py-2.5">
                      <span className="block text-[0.7rem] text-slate-700">{row.verifikator ?? "—"}</span>
                      <span className="block text-[0.62rem] text-slate-400">
                        {row.verifiedAt ? formatWaktu(row.verifiedAt) : "Belum diverifikasi"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDetail(row)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[0.68rem] font-semibold transition",
                          row.status === "menunggu" && mode === "verifikasi" && bolehVerifikasi
                            ? "border-ink-200 bg-ink-50 text-ink-800 hover:bg-ink-100"
                            : "border-line bg-white text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <IconEye size={13} />{" "}
                        {mode === "verifikasi" && bolehVerifikasi && row.status !== "terverifikasi"
                          ? row.status === "selisih"
                            ? "Selesaikan"
                            : "Verifikasi"
                          : "Detail"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DepositDetailModal
        row={detail}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        mode={mode === "verifikasi" ? "verifikasi" : "detail"}
        onDone={(message) => setToast({ tone: "success", text: message })}
      />
    </div>
  );
}
