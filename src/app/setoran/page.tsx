import Link from "next/link";
import { DepositTable } from "@/components/deposit-table";
import { IconDownload, IconPlus, IconSearch } from "@/components/icons";
import { PageHeader, SectionCard, StatCard } from "@/components/ui";
import { getDeposits, getUnits } from "@/lib/queries";
import { STATUS_META, kategoriMeta, rupiah, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SP = { dari?: string; sampai?: string; ka?: string; kategori?: string; status?: string; q?: string; page?: string };

function offsetISO(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function buildQuery(sp: SP, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged = { ...sp, ...overrides };
  Object.entries(merged).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `/setoran?${query}` : "/setoran";
}

export default async function SetoranPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const filters = {
    dari: sp.dari || undefined,
    sampai: sp.sampai || undefined,
    unitId: sp.ka ? Number(sp.ka) : undefined,
    kategori: sp.kategori || undefined,
    status: sp.status || undefined,
    q: sp.q || undefined,
    page,
    pageSize: 20,
  };
  const [result, trains] = await Promise.all([getDeposits(filters), getUnits()]);
  const { rows, summary, totalPages } = result;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Modul 1 & 2 · Data"
        title="Data Setoran Pendapatan KA"
        description="Seluruh setoran hasil input Sales & Crew (KA, parkir, Loko Cafe, Booth Loko). Kasir dapat mencentang data berstatus menunggu untuk verifikasi massal; peran lain hanya dapat melihat."
        actions={
          <>
            <a
              href={`/api/setoran/export?${new URLSearchParams({
                ...(sp.dari ? { dari: sp.dari } : {}),
                ...(sp.sampai ? { sampai: sp.sampai } : {}),
                ...(sp.ka ? { unitId: sp.ka } : {}),
                ...(sp.kategori ? { kategori: sp.kategori } : {}),
                ...(sp.status ? { status: sp.status } : {}),
                ...(sp.q ? { q: sp.q } : {}),
              }).toString()}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[0.76rem] font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <IconDownload size={15} /> Ekspor CSV
            </a>
            <Link
              href="/slip"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50"
            >
              <IconDownload size={15} /> Rekap &amp; Slip
            </Link>
            <Link
              href="/setoran/baru"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.76rem] font-semibold text-white hover:bg-ink-900"
            >
              <IconPlus size={15} /> Input Setoran
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Jumlah Transaksi" value={`${summary.jumlah}`} hint="sesuai filter" />
        <StatCard label="Total Nominal" value={rupiah(summary.total)} hint={`Tunai ${rupiah(summary.tunai)}`} tone="sky" />
        <StatCard label="Non-Tunai" value={rupiah(summary.nonTunai)} hint="QRIS / EDC" tone="emerald" />
        <StatCard
          label="Status"
          value={`${summary.menunggu} menunggu`}
          hint={`${summary.terverifikasi} terverifikasi · ${summary.selisih} selisih`}
          tone="amber"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-400">Periode cepat:</span>
        {[
          { label: "Hari ini", dari: todayISO(), sampai: todayISO() },
          { label: "7 hari", dari: offsetISO(6), sampai: todayISO() },
          { label: "30 hari", dari: offsetISO(29), sampai: todayISO() },
          { label: "Bulan ini", dari: `${todayISO().slice(0, 7)}-01`, sampai: todayISO() },
        ].map((preset) => {
          const params = new URLSearchParams({ dari: preset.dari, sampai: preset.sampai });
          if (sp.ka) params.set("ka", sp.ka);
          if (sp.kategori) params.set("kategori", sp.kategori);
          if (sp.status) params.set("status", sp.status);
          if (sp.q) params.set("q", sp.q);
          const active = sp.dari === preset.dari && sp.sampai === preset.sampai;
          return (
            <Link
              key={preset.label}
              href={`/setoran?${params.toString()}`}
              className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition ${
                active ? "border-ink-700 bg-ink-800 text-white" : "border-line bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {preset.label}
            </Link>
          );
        })}
        {(sp.dari || sp.sampai) && (
          <Link href="/setoran" className="rounded-full border border-line bg-white px-2.5 py-1 text-[0.7rem] font-semibold text-slate-400 hover:bg-slate-50">
            Semua waktu
          </Link>
        )}
      </div>

      <SectionCard
        title="Filter Data"
        description="Kombinasikan parameter pencarian, lalu tekan Terapkan"
        bodyClassName="pt-3"
      >
        <form method="GET" action="/setoran" className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label className="label" htmlFor="dari">Dari Tanggal</label>
            <input id="dari" name="dari" type="date" defaultValue={sp.dari ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="sampai">Sampai Tanggal</label>
            <input id="sampai" name="sampai" type="date" defaultValue={sp.sampai ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="ka">Nama KA</label>
            <select id="ka" name="ka" defaultValue={sp.ka ?? ""} className="field">
              <option value="">Semua KA (63)</option>
              {trains.map((train) => (
                <option key={train.id} value={train.id}>
                  KA {train.nomorUnit} · {train.namaUnit}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ""} className="field">
              <option value="">Semua status</option>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="q">Pencarian</label>
            <input id="q" name="q" defaultValue={sp.q ?? ""} className="field" placeholder="Nama KA / petugas / kode" />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.76rem] font-semibold text-white hover:bg-ink-900"
            >
              <IconSearch size={15} /> Terapkan
            </button>
            <Link
              href="/setoran"
              className="rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-slate-500 hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title={`Daftar Setoran (${summary.jumlah})`}
        description={`Halaman ${page} dari ${totalPages} · ${summary.menunggu} data siap diverifikasi`}
        bodyClassName="p-0"
        action={
          <Link href="/verifikasi" className="text-[0.7rem] font-semibold text-ink-600 hover:text-ink-900">
            Buka dashboard Kasir →
          </Link>
        }
      >
        <DepositTable
          rows={rows}
          mode="data"
          canVerify
          emptyTitle="Tidak ada setoran pada filter ini"
          emptyDescription="Coba longgarkan filter tanggal atau pilih KA lain."
        />

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
            <p className="text-[0.72rem] text-slate-500">
              Menampilkan {rows.length} dari {summary.jumlah} setoran
            </p>
            <div className="flex items-center gap-1">
              <Link
                href={buildQuery(sp, { page: String(Math.max(1, page - 1)) })}
                aria-disabled={page <= 1}
                className={`rounded-lg border border-line px-2.5 py-1.5 text-[0.72rem] font-semibold ${
                  page <= 1 ? "pointer-events-none bg-slate-50 text-slate-300" : "bg-white text-ink-800 hover:bg-slate-50"
                }`}
              >
                ← Sebelumnya
              </Link>
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, index) => {
                const pageNumber = Math.max(1, Math.min(totalPages - 6, page - 3)) + index;
                if (pageNumber > totalPages) return null;
                return (
                  <Link
                    key={pageNumber}
                    href={buildQuery(sp, { page: String(pageNumber) })}
                    className={`numeric rounded-lg border px-2.5 py-1.5 text-[0.72rem] font-semibold ${
                      pageNumber === page
                        ? "border-ink-800 bg-ink-800 text-white"
                        : "border-line bg-white text-ink-800 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </Link>
                );
              })}
              <Link
                href={buildQuery(sp, { page: String(Math.min(totalPages, page + 1)) })}
                aria-disabled={page >= totalPages}
                className={`rounded-lg border border-line px-2.5 py-1.5 text-[0.72rem] font-semibold ${
                  page >= totalPages ? "pointer-events-none bg-slate-50 text-slate-300" : "bg-white text-ink-800 hover:bg-slate-50"
                }`}
              >
                Berikutnya →
              </Link>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
