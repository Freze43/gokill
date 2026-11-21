"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  IconAlert,
  IconCheck,
  IconEdit,
  IconPlus,
  IconSave,
  IconSearch,
  IconTrain,
  IconUpload,
  IconX,
} from "@/components/icons";
import { Callout, KategoriBadge, Modal, PageHeader, ProgressBar, SectionCard } from "@/components/ui";
import type { UnitRow } from "@/lib/queries";
import {
  KATEGORI_META,
  KATEGORI_ORDER,
  KELAS_OPTIONS,
  LAYANAN_PER_KATEGORI,
  cn,
  kategoriMeta,
  type UnitKategori,
} from "@/lib/utils";

type EditableUnit = UnitRow & { dirty?: boolean };

type NewUnitForm = {
  kategori: UnitKategori;
  kodeUnit: string;
  nomorUnit: string;
  namaUnit: string;
  layanan: string;
  relasi: string;
};

const emptyForm = (kategori: UnitKategori): NewUnitForm => ({
  kategori,
  kodeUnit: "",
  nomorUnit: "",
  namaUnit: "",
  layanan: LAYANAN_PER_KATEGORI[kategori][0],
  relasi: "",
});

function nextNomor(rows: UnitRow[], kategori: string) {
  const numbers = rows
    .filter((row) => row.kategori === kategori)
    .map((row) => Number(String(row.nomorUnit).replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return kategori === "ka" ? String(max + 1) : `P${String(max + 1).padStart(2, "0")}`;
}

export function MasterUnitEditor({ units }: { units: UnitRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableUnit[]>(units);
  const [activeTab, setActiveTab] = useState<string>("ka");
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<NewUnitForm>(emptyForm("ka"));

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkKategori, setBulkKategori] = useState<UnitKategori>("ka");
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: Array<{ namaUnit: string; alasan: string }> } | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = { semua: rows.length };
    for (const row of rows) map[row.kategori] = (map[row.kategori] ?? 0) + 1;
    return map;
  }, [rows]);

  const activeCount = rows.filter((row) => row.statusAktif).length;
  const dirtyRows = rows.filter((row) => row.dirty);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (activeTab !== "semua" && row.kategori !== activeTab) return false;
      if (onlyActive && !row.statusAktif) return false;
      if (!term) return true;
      return `${row.kodeUnit} ${row.namaUnit} ${row.nomorUnit} ${row.relasi} ${row.layanan}`.toLowerCase().includes(term);
    });
  }, [rows, q, onlyActive, activeTab]);

  const tabList = [{ key: "semua", label: "Semua Unit", icon: "📋" }, ...KATEGORI_ORDER.map((kategori) => ({
    key: kategori,
    label: KATEGORI_META[kategori].label,
    icon: KATEGORI_META[kategori].icon,
  }))];

  function patch(id: number, value: Partial<EditableUnit>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...value, dirty: true } : row)));
  }

  async function saveAll() {
    if (dirtyRows.length === 0) {
      setToast({ tone: "danger", text: "Belum ada perubahan yang perlu disimpan." });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/units", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: dirtyRows.map((row) => ({
            id: row.id,
            kodeUnit: row.kodeUnit,
            nomorUnit: row.nomorUnit,
            namaUnit: row.namaUnit,
            kategori: row.kategori,
            relasi: row.relasi,
            layanan: row.layanan,
            statusAktif: row.statusAktif,
          })),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; updated?: number };
      if (!response.ok || !payload.ok) {
        setToast({ tone: "danger", text: payload.message ?? "Gagal menyimpan perubahan" });
        return;
      }
      setRows((prev) => prev.map((row) => ({ ...row, dirty: false })));
      setToast({ tone: "success", text: `${payload.updated ?? dirtyRows.length} data unit berhasil diperbarui.` });
      router.refresh();
    } catch {
      setToast({ tone: "danger", text: "Terjadi kesalahan jaringan" });
    } finally {
      setBusy(false);
    }
  }

  function openAdd(kategori: UnitKategori) {
    setForm({ ...emptyForm(kategori), nomorUnit: nextNomor(rows, kategori) });
    setAddOpen(true);
  }

  async function submitAdd(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          kodeUnit: form.kodeUnit.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; data?: UnitRow };
      if (!response.ok || !payload.ok || !payload.data) {
        setToast({ tone: "danger", text: payload.message ?? "Gagal menambah unit" });
        return;
      }
      setRows((prev) => [...prev, { ...payload.data!, jumlahSetoran: 0 }]);
      setActiveTab(form.kategori);
      setAddOpen(false);
      setToast({ tone: "success", text: payload.message ?? "Unit baru ditambahkan." });
      router.refresh();
    } catch {
      setToast({ tone: "danger", text: "Terjadi kesalahan jaringan" });
    } finally {
      setBusy(false);
    }
  }

  function parseBulk(text: string, kategori: UnitKategori) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const parts = line.split("|").map((part) => part.trim());
        const defaultLayanan = LAYANAN_PER_KATEGORI[kategori][0];
        if (parts.length === 1) {
          return { kategori, namaUnit: parts[0], nomorUnit: "", layanan: defaultLayanan };
        }
        return {
          kategori,
          nomorUnit: parts[0],
          namaUnit: parts[1] ?? "",
          relasi: parts[2] ?? "",
          layanan: parts[3] || defaultLayanan,
        };
      });
  }

  async function submitBulk(event: React.FormEvent) {
    event.preventDefault();
    const items = parseBulk(bulkText, bulkKategori);
    if (items.length === 0) {
      setToast({ tone: "danger", text: "Daftar masih kosong. Tulis satu unit per baris." });
      return;
    }
    setBusy(true);
    setBulkResult(null);
    try {
      const response = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        data?: UnitRow | UnitRow[];
        created?: number;
        skipped?: Array<{ namaUnit: string; alasan: string }>;
      };
      if (!response.ok || !payload.ok) {
        setToast({ tone: "danger", text: payload.message ?? "Gagal menyimpan daftar" });
        setBulkResult({ created: 0, skipped: payload.skipped ?? [] });
        return;
      }
      const createdRows = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
      setRows((prev) => [...prev, ...createdRows.map((row) => ({ ...row, jumlahSetoran: 0 }))]);
      setBulkResult({ created: payload.created ?? createdRows.length, skipped: payload.skipped ?? [] });
      setActiveTab(bulkKategori);
      setBulkText("");
      setToast({ tone: "success", text: payload.message ?? "Daftar unit tersimpan." });
      router.refresh();
    } catch {
      setToast({ tone: "danger", text: "Terjadi kesalahan jaringan" });
    } finally {
      setBusy(false);
    }
  }

  async function removeUnit(row: EditableUnit) {
    if (row.jumlahSetoran > 0) {
      setToast({ tone: "danger", text: "Unit sudah memiliki riwayat setoran. Nonaktifkan saja agar data historis tetap valid." });
      return;
    }
    if (!window.confirm(`Hapus unit "${row.namaUnit}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/units?id=${row.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setToast({ tone: "danger", text: payload.message ?? "Gagal menghapus unit" });
        return;
      }
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setToast({ tone: "success", text: "Unit dihapus dari master data." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Modul 1 · Administrasi (Admin)"
        title="Master Unit Setoran"
        description="Pusat data seluruh sumber pendapatan: 63 Kereta Api, 13 titik Parkir, 2 Loko Cafe, dan Booth Loko. Tambahkan daftar KA terbaru, edit beberapa nama sekaligus, atau nonaktifkan unit yang tidak beroperasi."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setBulkKategori(activeTab === "semua" ? "ka" : (activeTab as UnitKategori));
                setBulkOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50"
            >
              <IconUpload size={15} /> Tambah Daftar Massal
            </button>
            <button
              type="button"
              onClick={() => openAdd(activeTab === "semua" ? "ka" : (activeTab as UnitKategori))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50"
            >
              <IconPlus size={15} /> Tambah Unit
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={busy || dirtyRows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.76rem] font-semibold text-white hover:bg-ink-900 disabled:opacity-50"
            >
              <IconSave size={15} /> {busy ? "Menyimpan…" : `Simpan Perubahan${dirtyRows.length > 0 ? ` (${dirtyRows.length})` : ""}`}
            </button>
          </>
        }
      />

      {toast && (
        <div
          className={cn(
            "flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-[0.76rem] font-medium",
            toast.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          <span className="flex items-center gap-1.5">
            {toast.tone === "success" ? <IconCheck size={15} /> : <IconAlert size={15} />} {toast.text}
          </span>
          <button onClick={() => setToast(null)} className="rounded p-0.5 hover:bg-white/60">
            <IconX size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <div className="card p-3.5">
          <p className="text-[0.64rem] font-bold uppercase tracking-wide text-slate-400">Total unit</p>
          <p className="numeric mt-1 text-[1.2rem] font-extrabold text-ink-900">{rows.length}</p>
          <div className="mt-1.5"><ProgressBar value={(rows.length / 79) * 100} tone="ink" /></div>
          <p className="mt-1 text-[0.64rem] text-slate-500">{activeCount} aktif · {rows.length - activeCount} nonaktif</p>
        </div>
        {KATEGORI_ORDER.map((kategori) => {
          const meta = KATEGORI_META[kategori];
          const total = counts[kategori] ?? 0;
          const aktif = rows.filter((row) => row.kategori === kategori && row.statusAktif).length;
          return (
            <button
              key={kategori}
              type="button"
              onClick={() => setActiveTab(kategori)}
              className={cn(
                "card p-3.5 text-left transition hover:border-ink-300",
                activeTab === kategori && "ring-2 ring-ink-700",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.58rem] font-bold uppercase ring-1 ring-inset", meta.badge)}>
                  <span aria-hidden>{meta.icon}</span> {meta.singkat}
                </span>
                <span className="text-[0.6rem] text-slate-400">{aktif} aktif</span>
              </div>
              <p className="numeric mt-1.5 text-[1.2rem] font-extrabold leading-none text-ink-900">{total}</p>
              <p className="mt-1 text-[0.62rem] text-slate-500">{meta.deskripsi}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {tabList.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.74rem] font-semibold transition",
                activeTab === tab.key
                  ? "border-ink-700 bg-ink-800 text-white"
                  : "border-line bg-white text-slate-600 hover:border-ink-300 hover:bg-slate-50",
              )}
            >
              <span aria-hidden>{tab.icon}</span>
              {tab.label}
              <span className={cn("numeric rounded px-1 text-[0.6rem] font-bold", activeTab === tab.key ? "bg-white/20" : "bg-slate-100 text-slate-500")}>
                {counts[tab.key] ?? 0}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => openAdd(activeTab === "semua" ? "ka" : (activeTab as UnitKategori))}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-ink-300 bg-white px-2.5 py-1.5 text-[0.72rem] font-semibold text-ink-700 hover:bg-ink-50"
          >
            <IconPlus size={13} /> Tambah {activeTab === "semua" ? "KA" : KATEGORI_META[activeTab as UnitKategori].label}
          </button>
        </div>
      </div>

      <SectionCard
        title={
          activeTab === "semua"
            ? `Daftar Master Unit (${filtered.length})`
            : `Daftar ${KATEGORI_META[activeTab as UnitKategori].label} (${filtered.length})`
        }
        description={
          activeTab === "ka"
            ? "Admin dapat menambah/mengubah daftar KA terbaru. Klik kolom untuk mengedit langsung, lalu simpan."
            : "Sama seperti KA: nama, kode, lokasi/relasi, dan jenis layanan dapat diubah kapan saja."
        }
        bodyClassName="p-0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-[0.7rem] font-medium text-slate-600">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(event) => setOnlyActive(event.target.checked)}
                className="h-3.5 w-3.5 rounded accent-ink-800"
              />
              Hanya aktif
            </label>
            <div className="relative">
              <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Cari nama / kode / lokasi"
                className="field w-[12rem] py-1.5 pl-7 text-[0.72rem]"
              />
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-[0.74rem]">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-[0.62rem] uppercase tracking-wide text-slate-500">
                <th className="w-8 px-3 py-2 font-semibold">#</th>
                <th className="w-24 px-2 py-2 font-semibold">Kode</th>
                <th className="w-16 px-2 py-2 font-semibold">No.</th>
                <th className="px-2 py-2 font-semibold">Nama Unit</th>
                <th className="px-2 py-2 font-semibold">Relasi / Lokasi</th>
                <th className="w-32 px-2 py-2 font-semibold">Kategori</th>
                <th className="w-36 px-2 py-2 font-semibold">Layanan</th>
                <th className="w-20 px-2 py-2 font-semibold">Status</th>
                <th className="w-16 px-2 py-2 text-center font-semibold">Setoran</th>
                <th className="w-20 px-3 py-2 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((row, index) => (
                <tr key={row.id} className={cn(row.dirty && "bg-amber-50/50", !row.statusAktif && "opacity-70")}>
                  <td className="numeric px-3 py-1.5 text-[0.66rem] text-slate-400">
                    {index + 1}
                    {row.dirty && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.kodeUnit}
                      onChange={(event) => patch(row.id, { kodeUnit: event.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 font-mono text-[0.66rem] text-slate-600 hover:border-line focus:border-ink-500 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.nomorUnit}
                      onChange={(event) => patch(row.id, { nomorUnit: event.target.value })}
                      className="numeric w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[0.72rem] font-semibold text-ink-800 hover:border-line focus:border-ink-500 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.namaUnit}
                      onChange={(event) => patch(row.id, { namaUnit: event.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[0.75rem] font-medium text-ink-900 hover:border-line focus:border-ink-500 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.relasi}
                      onChange={(event) => patch(row.id, { relasi: event.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[0.7rem] text-slate-600 hover:border-line focus:border-ink-500 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.kategori}
                      onChange={(event) => patch(row.id, { kategori: event.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-[0.68rem] text-slate-600 hover:border-line focus:border-ink-500 focus:bg-white focus:outline-none"
                    >
                      {KATEGORI_ORDER.map((kategori) => (
                        <option key={kategori} value={kategori}>{KATEGORI_META[kategori].label}</option>
                      ))}
                    </select>
                    <div className="mt-0.5"><KategoriBadge kategori={row.kategori} /></div>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.layanan}
                      onChange={(event) => patch(row.id, { layanan: event.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-[0.68rem] text-slate-600 hover:border-line focus:border-ink-500 focus:bg-white focus:outline-none"
                    >
                      {[...new Set([...LAYANAN_PER_KATEGORI[(row.kategori as UnitKategori) ?? "ka"], ...KELAS_OPTIONS, row.layanan])].map((layanan) => (
                        <option key={layanan} value={layanan}>{layanan}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => patch(row.id, { statusAktif: !row.statusAktif })}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold ring-1 ring-inset transition",
                        row.statusAktif ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200",
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", row.statusAktif ? "bg-emerald-500" : "bg-slate-400")} />
                      {row.statusAktif ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td className="numeric px-2 py-1.5 text-center text-[0.68rem] text-slate-500">
                    {row.jumlahSetoran > 0 ? (
                      <Link href={`/setoran?ka=${row.id}`} className="font-semibold text-ink-600 underline-offset-2 hover:underline">
                        {row.jumlahSetoran}
                      </Link>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openAdd(row.kategori as UnitKategori)}
                        title="Tambah unit kategori ini"
                        className="rounded-md p-1 text-slate-300 transition hover:bg-ink-50 hover:text-ink-700"
                      >
                        <IconPlus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeUnit(row)}
                        title="Hapus unit"
                        className="rounded-md p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-[0.78rem] text-slate-400">
                    Belum ada unit pada kategori/pencarian ini.{" "}
                    <button type="button" onClick={() => openAdd(activeTab === "semua" ? "ka" : (activeTab as UnitKategori))} className="font-semibold text-ink-700 underline">
                      Tambah sekarang
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-slate-50/60 px-4 py-2.5 text-[0.7rem] text-slate-500">
          <span className="flex items-center gap-1.5">
            <IconEdit size={13} /> {dirtyRows.length} baris belum disimpan — nama, kode, lokasi, kategori, layanan & status bisa diubah langsung
          </span>
          <span className="flex items-center gap-1.5">
            <IconTrain size={13} /> {filtered.length} baris ditampilkan
          </span>
        </div>
      </SectionCard>

      <Callout tone="info" title="Alur Admin → Operasional">
        Setelah daftar KA/parkir/cafe/booth diperbarui di sini, unit otomatis muncul pada dropdown Input Setoran (Sales & Crew),
        filter Verifikasi Kasir, Kalender Pendapatan, dan parameter cetak Slip. Nonaktifkan unit (bukan hapus) jika sudah tidak
        beroperasi agar riwayat setoran tetap utuh.
      </Callout>

      {/* ============ MODAL TAMBAH UNIT ============ */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah Unit Setoran"
        subtitle="Daftar KA terbaru, titik parkir baru, outlet cafe, atau booth"
        size="md"
      >
        <form onSubmit={submitAdd} className="space-y-3">
          <div>
            <label className="label">Kategori</label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {KATEGORI_ORDER.map((kategori) => (
                <button
                  key={kategori}
                  type="button"
                  onClick={() => setForm({ ...form, kategori, layanan: LAYANAN_PER_KATEGORI[kategori][0] })}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-[0.72rem] font-semibold transition",
                    form.kategori === kategori ? "border-ink-700 bg-ink-800 text-white" : "border-line bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <span aria-hidden className="mr-1">{KATEGORI_META[kategori].icon}</span>
                  {KATEGORI_META[kategori].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">No. / Kode Unit {form.kategori === "ka" ? "(nomor KA)" : "(kode lokasi)"}</label>
              <input className="field" value={form.nomorUnit} onChange={(event) => setForm({ ...form, nomorUnit: event.target.value })} placeholder={form.kategori === "ka" ? "64" : "P14"} required />
            </div>
            <div>
              <label className="label">Kode Unik (opsional)</label>
              <input className="field" value={form.kodeUnit} onChange={(event) => setForm({ ...form, kodeUnit: event.target.value })} placeholder="PRK-P14 / ABA-064" />
            </div>
          </div>
          <div>
            <label className="label">Nama Unit</label>
            <input className="field" value={form.namaUnit} onChange={(event) => setForm({ ...form, namaUnit: event.target.value })} placeholder={form.kategori === "ka" ? "Nama kereta api terbaru" : "Nama lokasi / outlet"} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Jenis Layanan</label>
              <select className="field" value={form.layanan} onChange={(event) => setForm({ ...form, layanan: event.target.value })}>
                {[...new Set([...LAYANAN_PER_KATEGORI[form.kategori], ...KELAS_OPTIONS])].map((layanan) => (
                  <option key={layanan} value={layanan}>{layanan}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Relasi / Lokasi</label>
              <input className="field" value={form.relasi} onChange={(event) => setForm({ ...form, relasi: event.target.value })} placeholder={form.kategori === "ka" ? "Gambir – Surabaya" : "Area / lantai / stasiun"} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-slate-500 hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-4 py-2 text-[0.78rem] font-bold text-white hover:bg-ink-900 disabled:opacity-60">
              <IconPlus size={15} /> {busy ? "Menyimpan…" : "Simpan Unit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============ MODAL MASSAL ============ */}
      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Tambah Daftar Unit Massal"
        subtitle="Tempel daftar KA terbaru / titik parkir / outlet sekaligus"
        size="lg"
      >
        <form onSubmit={submitBulk} className="space-y-3">
          <div>
            <label className="label">Kategori Daftar</label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {KATEGORI_ORDER.map((kategori) => (
                <button
                  key={kategori}
                  type="button"
                  onClick={() => setBulkKategori(kategori)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-[0.72rem] font-semibold transition",
                    bulkKategori === kategori ? "border-ink-700 bg-ink-800 text-white" : "border-line bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <span aria-hidden className="mr-1">{KATEGORI_META[kategori].icon}</span>
                  {KATEGORI_META[kategori].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Daftar Unit (satu baris satu unit)</label>
            <textarea
              className="field min-h-[190px] resize-y font-mono text-[0.74rem]"
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              placeholder={`Format: nomor|nama|relasi|lokasi|layanan\n\nContoh KA:\n64|Argo Merbabu|Gambir – Semarang Tawang|Eksekutif\n65|Airlangga Baru|Pasarsenen – Surabaya Pasarturi|Ekonomi\n\nContoh Parkir:\nP14|Parkir Expo Tawang|Area expo|Jasa Parkir\n\nContoh Cafe/Booth:\nCF03|Loko Cafe Semarang Tawang|Peron utara|Cafe & Resto`}
            />
            <p className="mt-1 text-[0.68rem] text-slate-500">
              Hanya nama juga boleh (nomor diisi otomatis). Kolom layanan opsional — default {KATEGORI_META[bulkKategori].label}:
              <strong> {LAYANAN_PER_KATEGORI[bulkKategori][0]}</strong>. Kode unik dibuat otomatis dan kode/duplikat yang sudah ada dilewati.
            </p>
          </div>

          {bulkResult && (
            <div className="rounded-lg border border-line bg-slate-50 p-2.5 text-[0.72rem]">
              <p className="font-semibold text-emerald-700">{bulkResult.created} unit berhasil ditambahkan.</p>
              {bulkResult.skipped.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-slate-500">
                  {bulkResult.skipped.slice(0, 6).map((item, index) => (
                    <li key={`${item.namaUnit}-${index}`}>• {item.namaUnit} — {item.alasan}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-slate-500 hover:bg-slate-50"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-4 py-2 text-[0.78rem] font-bold text-white hover:bg-ink-900 disabled:opacity-60"
            >
              <IconUpload size={15} /> {busy ? "Menyimpan…" : `Simpan Daftar ${KATEGORI_META[bulkKategori].label}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
