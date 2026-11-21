import Link from "next/link";
import { ActivityFeed } from "@/components/activity-feed";
import { RevenueBarChart, StatusDonut } from "@/components/charts";
import { Greeting } from "@/components/greeting";
import { RoleQuickActions } from "@/components/role-quick-actions";
import {
  IconArrowRight,
  IconArrowUp,
  IconCheck,
  IconClock,
  IconPlus,
  IconPrinter,
  IconReceipt,
  IconShieldCheck,
  IconTrain,
  IconWallet,
} from "@/components/icons";
import { PageHeader, ProgressBar, SectionCard, StatCard, StatusBadge } from "@/components/ui";
import { getDashboardData } from "@/lib/queries";
import { KATEGORI_META, KATEGORI_ORDER, formatTanggal, formatWaktu, lastDayOfMonth, rupiah, rupiahShort, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const data = await getDashboardData();
  const { monthSummary, trainCounts, dailySeries, todayRow, topTrains, pendingQueue, belumSetor, recent } = data;
  const totalUnit = trainCounts?.total ?? 63;
  const trend =
    data.prevTotal > 0 ? ((Number(monthSummary.total) - data.prevTotal) / data.prevTotal) * 100 : null;
  const verifiedRatio = monthSummary.jumlah > 0 ? (monthSummary.terverifikasi / monthSummary.jumlah) * 100 : 0;
  const topMax = Math.max(1, ...topTrains.map((train) => Number(train.total)));

  return (
    <div className="space-y-4">
      {/* HERO */}
      <section className="animate-rise relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-ink-950 p-5 text-white shadow-card sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-400/20 blur-2xl" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.07]" aria-hidden>
          <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" stroke="white" strokeWidth="1">
            {Array.from({ length: 9 }).map((_, index) => (
              <path key={index} d={`M${20 + index * 20} 200 L${70 + index * 20} 0`} />
            ))}
          </svg>
        </div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-brand-300">Ruang kendali pendapatan</p>
            <h2 className="mt-1.5 text-[1.35rem] font-extrabold leading-tight sm:text-[1.6rem]">
              <Greeting />
            </h2>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-white/60">
              Pantau setoran {totalUnit} unit pendapatan — KA, parkir, Loko Cafe, dan Booth Loko — verifikasi bukti setor, lalu
              terbitkan slip resmi.
            </p>
            <div className="mt-4">
              <RoleQuickActions pending={monthSummary.menunggu} />
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2.5 lg:w-[24rem]">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.62rem] uppercase tracking-wide text-white/50">Unit setor hari ini</p>
              <p className="numeric mt-1 text-[1.15rem] font-extrabold">
                {todayRow.jumlah}
                <span className="text-[0.75rem] font-semibold text-white/40">/{totalUnit} KA</span>
              </p>
              <div className="mt-1.5">
                <ProgressBar value={(todayRow.jumlah / Math.max(totalUnit, 1)) * 100} tone="amber" />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.62rem] uppercase tracking-wide text-white/50">Pendapatan hari ini</p>
              <p className="numeric mt-1 text-[1.15rem] font-extrabold">{rupiahShort(todayRow.total)}</p>
              <p className="mt-1 text-[0.62rem] text-white/45">{formatTanggal(todayISO())}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.62rem] uppercase tracking-wide text-white/50">Terverifikasi hari ini</p>
              <p className="numeric mt-1 text-[1.05rem] font-extrabold text-emerald-300">{todayRow.terverifikasi} KA</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
              <p className="text-[0.62rem] uppercase tracking-wide text-white/50">Perlu tindakan</p>
              <p className="numeric mt-1 text-[1.05rem] font-extrabold text-brand-200">
                {todayRow.menunggu + todayRow.selisih} KA
              </p>
            </div>
          </div>
        </div>
      </section>

      {denied && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[0.78rem] font-medium text-amber-800">
          <IconShieldCheck size={16} className="mt-0.5 shrink-0" />
          Akses ke modul tersebut dibatasi untuk peran Anda. Hubungi Admin bila memerlukan izin tambahan.
        </div>
      )}

      <PageHeader
        eyebrow="Ringkasan bulan berjalan"
        title="Kinerja Setoran Pendapatan"
        description={`Ringkasan ${formatTanggal(`${data.bulan}-01`)} — ${formatTanggal(lastDayOfMonth(data.bulan))}. Data contoh otomatis disiapkan untuk simulasi seluruh modul.`}
        actions={
          <>
            <Link
              href="/kalender"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50"
            >
              <IconClock size={15} /> Kalender Pendapatan
            </Link>
            <Link
              href="/setoran"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.76rem] font-semibold text-white hover:bg-ink-900"
            >
              <IconReceipt size={15} /> Semua Data
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total Setoran Bulan Ini"
          value={rupiah(monthSummary.total)}
          icon={<IconWallet size={16} />}
          tone="ink"
          hint={`${monthSummary.jumlah} transaksi`}
          trend={trend !== null ? { value: `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}% vs bulan lalu`, positive: trend >= 0 } : undefined}
        />
        <StatCard
          label="Terverifikasi"
          value={`${monthSummary.terverifikasi} Setoran`}
          icon={<IconCheck size={16} />}
          tone="emerald"
          hint={`${rupiah(monthSummary.verifiedTotal)} siap cetak slip`}
        />
        <StatCard
          label="Menunggu Verifikasi"
          value={`${monthSummary.menunggu} Setoran`}
          icon={<IconClock size={16} />}
          tone="amber"
          hint={`Nilai ${rupiah(monthSummary.pendingTotal)}`}
        />
        <StatCard
          label="Selisih / Revisi"
          value={`${monthSummary.selisih} Setoran`}
          icon={<IconShieldCheck size={16} />}
          tone="rose"
          hint="Dikembalikan ke petugas"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {KATEGORI_ORDER.map((kategori) => {
          const meta = KATEGORI_META[kategori];
          const row = data.kategoriSummary.find((item) => item.kategori === kategori);
          const total = Number(row?.total ?? 0);
          const share = monthSummary.total > 0 ? (total / Number(monthSummary.total)) * 100 : 0;
          return (
            <Link key={kategori} href={`/setoran?kategori=${kategori}`} className="card p-3.5 transition hover:border-ink-300">
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6rem] font-bold uppercase ring-1 ring-inset ${meta.badge}`}>
                  <span aria-hidden>{meta.icon}</span> {meta.singkat}
                </span>
                <span className="numeric text-[0.62rem] font-semibold text-slate-400">{row?.unit ?? 0} unit</span>
              </div>
              <p className="numeric mt-2 text-[0.98rem] font-extrabold leading-none text-ink-900">{rupiahShort(total)}</p>
              <div className="mt-2"><ProgressBar value={share} tone={kategori === "ka" ? "ink" : kategori === "parkir" ? "emerald" : "amber"} /></div>
              <p className="mt-1 text-[0.62rem] text-slate-500">
                {share.toFixed(1)}% · {row?.transaksi ?? 0} setoran · {row?.menunggu ?? 0} menunggu
              </p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Tren Pendapatan Harian"
          description="Total nominal setoran per tanggal dinas pada bulan berjalan"
          action={
            <Link href="/kalender" className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-ink-600 hover:text-ink-900">
              Lihat kalender <IconArrowRight size={13} />
            </Link>
          }
        >
          <RevenueBarChart data={dailySeries} totalUnit={totalUnit} />
        </SectionCard>

        <SectionCard title="Status Verifikasi" description={`${verifiedRatio.toFixed(1)}% setoran sudah terverifikasi`}>
          <StatusDonut
            centerLabel="Transaksi"
            centerValue={String(monthSummary.jumlah)}
            segments={[
              { label: "Terverifikasi", value: monthSummary.terverifikasi, color: "#10b981" },
              { label: "Menunggu", value: monthSummary.menunggu, color: "#f9b32f" },
              { label: "Selisih", value: monthSummary.selisih, color: "#f43f5e" },
            ]}
          />
          <div className="mt-3 rounded-xl bg-slate-50 p-2.5">
            <div className="mb-1 flex items-center justify-between text-[0.68rem] font-medium text-slate-500">
              <span>Cakupan KA bulan ini</span>
              <span className="numeric font-bold text-ink-800">{monthSummary.kaUnik}/{totalUnit}</span>
            </div>
            <ProgressBar value={(monthSummary.kaUnik / Math.max(totalUnit, 1)) * 100} tone="ink" />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Kelengkapan Setoran Hari Ini"
          description={`Progres per kategori untuk ${formatTanggal(data.today, true)}`}
          action={
            <Link
              href={`/setoran?dari=${data.today}&sampai=${data.today}`}
              className="text-[0.7rem] font-semibold text-ink-600 hover:text-ink-900"
            >
              Lihat data →
            </Link>
          }
          bodyClassName="space-y-2.5"
        >
          {KATEGORI_ORDER.map((kategori) => {
            const meta = KATEGORI_META[kategori];
            const row = data.todayKategori.find((item) => item.kategori === kategori);
            const aktif = Number(row?.unitAktif ?? 0);
            const sudah = Number(row?.sudah ?? 0);
            const persen = aktif > 0 ? (sudah / aktif) * 100 : 0;
            return (
              <div key={kategori}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-[0.72rem]">
                  <span className="flex items-center gap-1.5 font-medium text-ink-900">
                    <span aria-hidden>{meta.icon}</span> {meta.label}
                    <span className="text-[0.62rem] font-normal text-slate-400">{sudah}/{aktif} unit</span>
                  </span>
                  <span className="numeric text-[0.68rem] font-semibold text-ink-800">
                    {rupiah(Number(row?.total ?? 0))}
                    {Number(row?.menunggu ?? 0) > 0 && (
                      <span className="ml-1.5 rounded bg-amber-50 px-1 py-0.5 text-[0.58rem] font-bold text-amber-700">
                        {row?.menunggu} menunggu
                      </span>
                    )}
                  </span>
                </div>
                <ProgressBar value={persen} tone={kategori === "ka" ? "ink" : kategori === "parkir" ? "emerald" : "amber"} />
              </div>
            );
          })}
          <p className="pt-1 text-[0.66rem] text-slate-400">
            Target: setiap unit aktif mencatat satu setoran per tanggal dinas. Gunakan master unit untuk menonaktifkan unit
            yang tidak beroperasi.
          </p>
        </SectionCard>

        <SectionCard
          title="Aktivitas Terbaru"
          description="Input & keputusan verifikasi"
          bodyClassName="px-2 py-1.5"
          action={
            <Link href="/audit" className="text-[0.7rem] font-semibold text-ink-600 hover:text-ink-900">
              Audit →
            </Link>
          }
        >
          <ActivityFeed items={data.activity} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          title="Antrean Verifikasi Teratas"
          description="Setoran menunggu persetujuan"
          action={
            <Link href="/verifikasi" className="text-[0.7rem] font-semibold text-ink-600 hover:text-ink-900">
              Buka antrean
            </Link>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-line/70">
            {pendingQueue.length === 0 && (
              <li className="px-4 py-6 text-center text-[0.76rem] text-slate-400">Tidak ada antrean. 🎉</li>
            )}
            {pendingQueue.map((row) => (
              <li key={row.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-[0.62rem] font-bold text-amber-700">
                  KA
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.76rem] font-semibold text-ink-900">
                    {row.namaUnit} <span className="font-normal text-slate-400">· {row.nomorUnit}</span>
                  </p>
                  <p className="text-[0.66rem] text-slate-500">
                    {formatTanggal(row.tanggalDinas)} · {row.petugas}
                  </p>
                </div>
                <div className="text-right">
                  <p className="numeric text-[0.75rem] font-bold text-ink-900">{rupiahShort(row.total)}</p>
                  <StatusBadge status={row.status} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Top 5 Unit — Pendapatan" description="Nominal setoran tertinggi bulan ini (KA & unit usaha)" bodyClassName="space-y-2.5">
          {topTrains.map((train, index) => (
            <div key={train.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[0.72rem]">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-ink-800 text-[0.55rem] font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="truncate font-medium text-ink-900">
                    {train.namaUnit} <span className="text-slate-400">· {train.nomorUnit}</span>
                  </span>
                </span>
                <span className="numeric shrink-0 font-semibold text-ink-800">{rupiahShort(Number(train.total))}</span>
              </div>
              <ProgressBar value={(Number(train.total) / topMax) * 100} tone="amber" />
            </div>
          ))}
          {topTrains.length === 0 && <p className="py-6 text-center text-[0.76rem] text-slate-400">Belum ada data.</p>}
        </SectionCard>

        <SectionCard
          title="Belum Setor Hari Ini"
          description="Unit aktif yang belum mencatat setoran"
          bodyClassName="p-0"
          className="lg:col-span-2 xl:col-span-1"
        >
          <ul className="divide-y divide-line/70">
            {belumSetor.length === 0 && (
              <li className="flex items-center gap-2 px-4 py-6 text-[0.76rem] font-medium text-emerald-600">
                <IconCheck size={15} /> Semua KA aktif sudah menyetor hari ini.
              </li>
            )}
            {belumSetor.map((train) => (
              <li key={train.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                  <IconTrain size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.75rem] font-semibold text-ink-900">
                    {train.namaUnit} <span className="font-normal text-slate-400">({train.nomorUnit})</span>
                  </p>
                  <p className="truncate text-[0.64rem] text-slate-500">{train.relasi}</p>
                </div>
                <Link href={`/setoran/baru?ka=${train.id}`} className="rounded-md bg-ink-50 px-2 py-1 text-[0.62rem] font-bold text-ink-700 hover:bg-ink-100">
                  Input
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Setoran Terbaru"
        description="Aktivitas input setoran terakhir"
        action={
          <Link href="/setoran" className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-ink-600 hover:text-ink-900">
            Lihat semua <IconArrowRight size={13} />
          </Link>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[0.76rem]">
            <thead>
              <tr className="border-b border-line bg-slate-50/60 text-[0.64rem] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-semibold">Tanggal</th>
                <th className="px-2 py-2 font-semibold">Kereta Api</th>
                <th className="px-2 py-2 font-semibold">Petugas</th>
                <th className="px-2 py-2 text-right font-semibold">Tunai</th>
                <th className="px-2 py-2 text-right font-semibold">Non-Tunai</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 text-right font-semibold">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {recent.map((row) => (
                <tr key={row.id} className="transition hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatTanggal(row.tanggalDinas)}</td>
                  <td className="px-2 py-2.5">
                    <span className="font-semibold text-ink-900">{row.namaUnit}</span>
                    <span className="ml-1 text-[0.65rem] text-slate-400">{row.nomorUnit}</span>
                  </td>
                  <td className="px-2 py-2.5 text-slate-600">{row.petugas}</td>
                  <td className="numeric px-2 py-2.5 text-right text-slate-600">{rupiah(row.tunai)}</td>
                  <td className="numeric px-2 py-2.5 text-right text-slate-600">{rupiah(row.nonTunai)}</td>
                  <td className="numeric px-2 py-2.5 text-right font-bold text-ink-900">{rupiah(row.total)}</td>
                  <td className="px-2 py-2.5"><StatusBadge status={row.status} size="sm" /></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-[0.66rem] text-slate-400">
                    {formatWaktu(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="flex flex-col items-start justify-between gap-2 rounded-xl border border-dashed border-line bg-white/60 px-4 py-3 sm:flex-row sm:items-center">
        <p className="text-[0.72rem] text-slate-500">
          <IconArrowUp size={13} className="mr-1 inline text-emerald-500" />
          Alur terintegrasi: <strong>Master KA</strong> → <strong>Input setoran</strong> → <strong>Verifikasi</strong> →{" "}
          <strong>Slip resmi</strong>. Hanya setoran terverifikasi yang dapat dicetak.
        </p>
        <Link href="/master-unit" className="text-[0.72rem] font-semibold text-ink-700 hover:text-ink-900">
          Kelola 79 master unit →
        </Link>
      </div>
    </div>
  );
}
