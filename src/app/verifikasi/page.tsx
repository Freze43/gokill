import Link from "next/link";
import { DepositTable } from "@/components/deposit-table";
import { RoleGate } from "@/components/role-gate";
import { IconAlert, IconCheck, IconClock, IconSearch, IconShieldCheck } from "@/components/icons";
import { ActivityFeed } from "@/components/activity-feed";
import { Callout, PageHeader, SectionCard, StatCard } from "@/components/ui";
import { getDeposits, getUnits, getActivityFeed } from "@/lib/queries";
import { STATUS_META, formatTanggal, kategoriMeta, rupiah, todayISO } from "@/lib/utils";

import { requirePageRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["kasir", "admin"] as const;

type SP = { dari?: string; sampai?: string; ka?: string; kategori?: string; status?: string; q?: string; page?: string };

export default async function VerifikasiPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePageRole([...ALLOWED_ROLES]);
  const sp = await searchParams;
  const status = sp.status ?? "menunggu";
  const page = Number(sp.page ?? "1") || 1;
  const today = todayISO();

  const [result, units, pendingAll, verifiedToday, selisihAll, activity] = await Promise.all([
    getDeposits({
      dari: sp.dari || undefined,
      sampai: sp.sampai || undefined,
      unitId: sp.ka ? Number(sp.ka) : undefined,
      kategori: sp.kategori || undefined,
      status,
      q: sp.q || undefined,
      page,
      pageSize: 15,
    }),
    getUnits(),
    getDeposits({ status: "menunggu", pageSize: 1 }),
    getDeposits({ dari: today, sampai: today, status: "terverifikasi", pageSize: 1 }),
    getDeposits({ status: "selisih", pageSize: 1 }),
    getActivityFeed(10),
  ]);

  const tabs = [
    { value: "menunggu", label: "Antrean Menunggu", count: pendingAll.summary.menunggu, tone: "bg-amber-400" },
    { value: "terverifikasi", label: "Terverifikasi", count: verifiedToday.summary.terverifikasi, tone: "bg-emerald-500" },
    { value: "selisih", label: "Selisih / Revisi", count: selisihAll.summary.selisih, tone: "bg-rose-500" },
    { value: "semua", label: "Semua Status", count: 0, tone: "bg-ink-400" },
  ];

  function tabHref(value: string) {
    const params = new URLSearchParams();
    if (value !== "menunggu") params.set("status", value);
    if (sp.dari) params.set("dari", sp.dari);
    if (sp.sampai) params.set("sampai", sp.sampai);
    if (sp.ka) params.set("ka", sp.ka);
    if (sp.kategori) params.set("kategori", sp.kategori);
    const query = params.toString();
    return query ? `/verifikasi?${query}` : "/verifikasi";
  }

  return (
    <RoleGate
      allow={["kasir", "admin"]}
      moduleName="Verifikasi Setoran"
      description="Verifikasi & persetujuan setoran hanya dilakukan oleh Kasir."
    >
    <div className="space-y-4">
      <PageHeader
        eyebrow="Modul 3 · Verifikasi (Kasir)"
        title="Dashboard Kasir — Verifikasi Setoran"
        description="Kasir membandingkan nominal input Sales/Crew (KA, parkir, cafe, booth) dengan bukti setor, lalu menyetujui atau mengembalikan dengan catatan selisih. Slip resmi diterbitkan setelah verifikasi."
        actions={
          <Link
            href="/setoran"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50"
          >
            <IconSearch size={15} /> Semua Data Setoran
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Antrean Menunggu" value={`${pendingAll.summary.menunggu}`} hint={`Nilai ${rupiah(pendingAll.summary.total)}`} tone="amber" icon={<IconClock size={16} />} />
        <StatCard label="Terverifikasi Hari Ini" value={`${verifiedToday.summary.terverifikasi}`} hint={rupiah(verifiedToday.summary.total)} tone="emerald" icon={<IconCheck size={16} />} />
        <StatCard label="Selisih / Revisi" value={`${selisihAll.summary.selisih}`} hint="Perlu perbaikan petugas" tone="rose" icon={<IconAlert size={16} />} />
        <StatCard label="Setoran Hari Ini" value={formatTanggal(today)} hint="Tanggal dinas berjalan" tone="sky" icon={<IconShieldCheck size={16} />} />
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-line bg-white p-1.5 shadow-card">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tabHref(tab.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[0.75rem] font-semibold transition ${
              status === tab.value ? "bg-ink-800 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-ink-800"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${tab.tone}`} />
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`numeric rounded px-1.5 py-0.5 text-[0.62rem] font-bold ${
                  status === tab.value ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      <SectionCard title="Filter Antrean" description="Cari berdasarkan tanggal, nama KA, atau kata kunci petugas">
        <form method="GET" action="/verifikasi" className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input type="hidden" name="status" value={status} />
          <div>
            <label className="label" htmlFor="dari">Tanggal Dari</label>
            <input id="dari" name="dari" type="date" defaultValue={sp.dari ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="sampai">Tanggal Sampai</label>
            <input id="sampai" name="sampai" type="date" defaultValue={sp.sampai ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="kategori">Kategori</label>
            <select id="kategori" name="kategori" defaultValue={sp.kategori ?? ""} className="field">
              <option value="">Semua kategori</option>
              <option value="ka">Kereta Api</option>
              <option value="parkir">Parkir</option>
              <option value="cafe">Loko Cafe</option>
              <option value="booth">Booth Loko</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ka">Unit / KA</label>
            <select id="ka" name="ka" defaultValue={sp.ka ?? ""} className="field">
              <option value="">Semua unit (79)</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  [{kategoriMeta(unit.kategori).singkat}] {unit.namaUnit}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="q">Kata Kunci</label>
            <input id="q" name="q" defaultValue={sp.q ?? ""} className="field" placeholder="Petugas / kode setoran" />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.76rem] font-semibold text-white hover:bg-ink-900">
              <IconSearch size={15} /> Cari
            </button>
            <Link href="/verifikasi" className="rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-slate-500 hover:bg-slate-50">
              Reset
            </Link>
          </div>
        </form>
      </SectionCard>

      <div className="grid gap-3 xl:grid-cols-[1fr_18rem]">
        <SectionCard
          title={`${STATUS_META[(status as keyof typeof STATUS_META) in STATUS_META ? (status as keyof typeof STATUS_META) : "menunggu"].label} (${result.summary.jumlah})`}
          description="Klik Verifikasi untuk melihat bukti setor dan membandingkan nominal"
          bodyClassName="p-0"
        >
          <DepositTable
            rows={result.rows}
            mode="verifikasi"
            canVerify={status === "menunggu" || status === "semua"}
            emptyTitle={status === "menunggu" ? "Antrean bersih — tidak ada setoran menunggu" : "Tidak ada data"}
            emptyDescription="Semua setoran pada filter ini sudah ditindaklanjuti."
          />
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
              <p className="text-[0.72rem] text-slate-500">Halaman {page} dari {result.totalPages}</p>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(result.totalPages, 6) }).map((_, index) => {
                  const pageNumber = index + 1;
                  const params = new URLSearchParams();
                  params.set("status", status);
                  if (sp.dari) params.set("dari", sp.dari);
                  if (sp.sampai) params.set("sampai", sp.sampai);
                  if (sp.ka) params.set("ka", sp.ka);
                  if (sp.kategori) params.set("kategori", sp.kategori);
                  if (sp.q) params.set("q", sp.q);
                  params.set("page", String(pageNumber));
                  return (
                    <Link
                      key={pageNumber}
                      href={`/verifikasi?${params.toString()}`}
                      className={`numeric rounded-lg border px-2.5 py-1.5 text-[0.72rem] font-semibold ${
                        pageNumber === page ? "border-ink-800 bg-ink-800 text-white" : "border-line bg-white text-ink-800 hover:bg-slate-50"
                      }`}
                    >
                      {pageNumber}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        <div className="space-y-3">
          <Callout tone="info" title="Alur verifikasi">
            1. Buka detail setoran (hasil input Sales/Crew) → bandingkan tunai/non-tunai dengan bukti resi.
            <br />
            2. <strong>Setujui</strong> bila sesuai, atau <strong>Revisi/Selisih</strong> dengan nominal &amp; catatan.
            <br />
            3. Data terverifikasi otomatis tersedia pada Modul 4 — Kasir menerbitkan slip resmi.
          </Callout>
          <Callout tone="warning" title="Verifikasi massal">
            Centang beberapa setoran yang sudah sesuai lalu tekan <strong>Verifikasi Massal</strong>. Hanya setoran berstatus
            menunggu yang dapat diproses.
          </Callout>
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h3 className="text-[0.84rem] font-bold text-ink-900">Aktivitas terbaru</h3>
              <span className="text-[0.62rem] font-semibold uppercase tracking-wide text-slate-400">Audit</span>
            </div>
            <div className="px-2 py-1.5">
              <ActivityFeed items={activity} />
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-[0.84rem] font-bold text-ink-900">Ringkasan filter</h3>
            <dl className="mt-2 space-y-1.5 text-[0.74rem]">
              <div className="flex justify-between"><dt className="text-slate-500">Jumlah data</dt><dd className="numeric font-semibold">{result.summary.jumlah}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Total tunai</dt><dd className="numeric font-semibold">{rupiah(result.summary.tunai)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Total non-tunai</dt><dd className="numeric font-semibold">{rupiah(result.summary.nonTunai)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1.5"><dt className="font-semibold text-ink-900">Grand total</dt><dd className="numeric font-extrabold text-ink-900">{rupiah(result.summary.total)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
    </RoleGate>
  );
}
