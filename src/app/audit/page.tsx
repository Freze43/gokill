import Link from "next/link";
import { IconCheck, IconClock, IconEdit, IconShieldCheck } from "@/components/icons";
import { RoleGate } from "@/components/role-gate";
import { KategoriBadge, PageHeader, SectionCard, StatCard } from "@/components/ui";
import { getAuditLog } from "@/lib/queries";
import { formatWaktu } from "@/lib/utils";

import { requirePageRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin"] as const;

const AKSI_META: Record<string, { label: string; badge: string; icon: typeof IconCheck }> = {
  dibuat: { label: "Dibuat", badge: "bg-sky-50 text-sky-700 ring-sky-200", icon: IconEdit },
  setujui: { label: "Disetujui", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: IconCheck },
  setujui_massal: { label: "Disetujui (massal)", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: IconShieldCheck },
  revisi: { label: "Revisi selisih", badge: "bg-rose-50 text-rose-700 ring-rose-200", icon: IconClock },
  selesaikan_selisih: { label: "Selisih selesai", badge: "bg-teal-50 text-teal-700 ring-teal-200", icon: IconCheck },
};

export default async function AuditPage() {
  await requirePageRole([...ALLOWED_ROLES]);
  const logs = await getAuditLog(60);
  const total = logs.length;
  const setuju = logs.filter((log) => log.aksi.startsWith("setujui")).length;
  const revisi = logs.filter((log) => log.aksi === "revisi").length;
  const aktorUnik = new Set(logs.map((log) => log.aktor)).size;

  return (
    <RoleGate allow={["admin"]} moduleName="Jejak Audit" description="Riwayat perubahan status setoran hanya dapat dilihat Admin.">
      <div className="space-y-4">
        <PageHeader
          eyebrow="Administrasi · Pengawasan"
          title="Jejak Audit Verifikasi"
          description="Catatan kronologis setiap input setoran, persetujuan, dan revisi selisih — lengkap dengan aktor, status sebelum/sesudah, serta catatan."
          actions={
            <>
              <Link href="/verifikasi" className="rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50">
                Antrean verifikasi
              </Link>
              <Link href="/master-unit" className="rounded-lg bg-ink-800 px-3 py-2 text-[0.76rem] font-semibold text-white hover:bg-ink-900">
                Master unit
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Entri log" value={`${total}`} hint="60 aktivitas terakhir" tone="ink" />
          <StatCard label="Persetujuan" value={`${setuju}`} hint="termasuk verifikasi massal" tone="emerald" icon={<IconCheck size={16} />} />
          <StatCard label="Revisi selisih" value={`${revisi}`} hint="dikembalikan ke petugas" tone="rose" icon={<IconClock size={16} />} />
          <StatCard label="Aktor terlibat" value={`${aktorUnik}`} hint="petugas & kasir" tone="sky" />
        </div>

        <SectionCard title="Riwayat Aktivitas" description="Urut dari yang terbaru" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[0.76rem]">
              <thead>
                <tr className="border-b border-line bg-slate-50/70 text-[0.62rem] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-semibold">Waktu</th>
                  <th className="px-2 py-2 font-semibold">Aksi</th>
                  <th className="px-2 py-2 font-semibold">Unit</th>
                  <th className="px-2 py-2 font-semibold">Kode Setoran</th>
                  <th className="px-2 py-2 font-semibold">Aktor</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {logs.map((log) => {
                  const meta = AKSI_META[log.aksi] ?? AKSI_META.dibuat;
                  const Icon = meta.icon;
                  return (
                    <tr key={log.id} className="transition hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-2 text-[0.68rem] text-slate-500">{formatWaktu(log.createdAt)}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-bold ring-1 ring-inset ${meta.badge}`}>
                          <Icon size={11} /> {meta.label}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="flex flex-wrap items-center gap-1 font-semibold text-ink-900">
                          {log.namaUnit} <KategoriBadge kategori={log.kategori} />
                        </span>
                      </td>
                      <td className="numeric px-2 py-2 text-[0.66rem] text-slate-500">{log.kodeSetoran}</td>
                      <td className="px-2 py-2 text-slate-700">{log.aktor}</td>
                      <td className="px-2 py-2 text-[0.66rem] text-slate-500">
                        {log.statusSebelum} → <strong className="text-ink-800">{log.statusSesudah}</strong>
                      </td>
                      <td className="max-w-[18rem] px-4 py-2 text-[0.68rem] text-slate-500">{log.catatan ?? "—"}</td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[0.78rem] text-slate-400">Belum ada aktivitas tercatat.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </RoleGate>
  );
}
