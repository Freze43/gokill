import Link from "next/link";
import { CalendarLegendHint, CalendarView } from "@/components/calendar-view";
import { IconArrowRight, IconCalendar, IconCheck, IconClock, IconPrinter, IconWallet } from "@/components/icons";
import { PageHeader, SectionCard, StatCard } from "@/components/ui";
import { getCalendarMonth, getKategoriSummary, getUnits } from "@/lib/queries";
import { KATEGORI_META, KATEGORI_ORDER, currentMonthISO, formatTanggal, monthLabel, rupiah, rupiahShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KalenderPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const sp = await searchParams;
  const bulan = /^\d{4}-\d{2}$/.test(sp.bulan ?? "") ? sp.bulan! : currentMonthISO();
  const units = await getUnits();
  const aktif = units.filter((unit) => unit.statusAktif).length || 79;
  const data = await getCalendarMonth(bulan, aktif);
  const kategoriSummary = await getKategoriSummary(data.dari, data.sampai);
  const jumlahKa = units.filter((unit) => unit.kategori === "ka").length;
  const jumlahParkir = units.filter((unit) => unit.kategori === "parkir").length;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Modul 2 · Pemantauan"
        title={`Kalender Pendapatan — ${monthLabel(bulan)}`}
        description="Setiap tanggal menampilkan jumlah unit yang menyetor (KA, parkir, Loko Cafe, Booth), total pendapatan, dan indikator status verifikasi harian. Klik tanggal untuk rincian."
        actions={
          <>
            <Link
              href="/setoran/baru"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50"
            >
              <IconCalendar size={15} /> Catat Setoran
            </Link>
            <Link
              href={`/slip?jenis=harian&tanggal=${bulan}-01`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.76rem] font-semibold text-white hover:bg-ink-900"
            >
              <IconPrinter size={15} /> Slip Terverifikasi
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Pendapatan" value={rupiah(data.totals.total)} hint={`${data.totals.jumlah} setoran tercatat`} tone="ink" icon={<IconWallet size={16} />} />
        <StatCard label="Terverifikasi" value={`${data.totals.terverifikasi} setoran`} hint={rupiah(data.totals.verifiedTotal)} tone="emerald" icon={<IconCheck size={16} />} />
        <StatCard label="Menunggu Verifikasi" value={`${data.totals.menunggu} setoran`} hint="Perlu tindakan verifikator" tone="amber" icon={<IconClock size={16} />} />
        <StatCard label="Selisih / Revisi" value={`${data.totals.selisih} setoran`} hint="Dikembalikan ke petugas" tone="rose" icon={<IconArrowRight size={16} />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <CalendarLegendHint />
        <p className="text-[0.7rem] text-slate-400">
          Rasio harian dihitung terhadap <strong className="text-ink-800">{aktif} unit aktif</strong> ({jumlahKa} KA · {jumlahParkir} parkir · 2 cafe · 1 booth).
        </p>
      </div>

      <CalendarView
        data={{
          bulan,
          totalUnit: aktif,
          days: data.days,
          totals: data.totals,
        }}
      />

      <SectionCard
        title="Rekap Pendapatan per Kategori Unit"
        description={`${formatTanggal(data.dari)} — ${formatTanggal(data.sampai)} · setoran terverifikasi maupun menunggu`}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[0.76rem]">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-[0.62rem] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-semibold">Kategori</th>
                <th className="px-2 py-2 text-right font-semibold">Unit</th>
                <th className="px-2 py-2 text-right font-semibold">Setoran</th>
                <th className="px-2 py-2 text-right font-semibold">Tunai</th>
                <th className="px-2 py-2 text-right font-semibold">Non-Tunai</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
                <th className="px-4 py-2 text-right font-semibold">Menunggu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {KATEGORI_ORDER.map((kategori) => {
                const row = kategoriSummary.find((item) => item.kategori === kategori);
                const meta = KATEGORI_META[kategori];
                return (
                  <tr key={kategori}>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.64rem] font-bold uppercase ring-1 ring-inset ${meta.badge}`}>
                        <span aria-hidden>{meta.icon}</span> {meta.label}
                      </span>
                      <span className="ml-2 text-[0.66rem] text-slate-500">{meta.deskripsi}</span>
                    </td>
                    <td className="numeric px-2 py-2 text-right text-slate-600">{row?.unit ?? 0}</td>
                    <td className="numeric px-2 py-2 text-right text-slate-600">{row?.transaksi ?? 0}</td>
                    <td className="numeric px-2 py-2 text-right text-slate-600">{rupiahShort(Number(row?.tunai ?? 0))}</td>
                    <td className="numeric px-2 py-2 text-right text-slate-600">{rupiahShort(Number(row?.nonTunai ?? 0))}</td>
                    <td className="numeric px-2 py-2 text-right font-bold text-ink-900">{rupiah(Number(row?.total ?? 0))}</td>
                    <td className="numeric px-4 py-2 text-right text-amber-600">{row?.menunggu ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-slate-50/60 font-bold text-ink-900">
                <td className="px-4 py-2 text-[0.72rem] uppercase tracking-wide" colSpan={5}>Grand total bulan ini</td>
                <td className="numeric px-2 py-2 text-right">{rupiah(data.totals.total)}</td>
                <td className="numeric px-4 py-2 text-right text-amber-600">{data.totals.menunggu}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-3.5">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">Rata-rata per hari</p>
          <p className="numeric mt-1 text-[1.05rem] font-extrabold text-ink-900">
            {rupiah(Math.round(data.totals.total / Math.max(1, Object.keys(data.days).length)))}
          </p>
          <p className="text-[0.68rem] text-slate-500">dari {Object.keys(data.days).length} hari aktif setoran</p>
        </div>
        <div className="card p-3.5">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">Rasio verifikasi</p>
          <p className="numeric mt-1 text-[1.05rem] font-extrabold text-ink-900">
            {data.totals.jumlah > 0 ? ((data.totals.terverifikasi / data.totals.jumlah) * 100).toFixed(1) : "0"}%
          </p>
          <p className="text-[0.68rem] text-slate-500">{data.totals.terverifikasi} dari {data.totals.jumlah} setoran terverifikasi</p>
        </div>
        <div className="card p-3.5">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">Komposisi pembayaran</p>
          <p className="numeric mt-1 text-[1.05rem] font-extrabold text-ink-900">{rupiah(data.totals.nonTunai)}</p>
          <p className="text-[0.68rem] text-slate-500">non-tunai / QRIS · tunai {rupiah(data.totals.tunai)}</p>
        </div>
      </div>
    </div>
  );
}
