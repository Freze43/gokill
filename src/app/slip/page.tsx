import Link from "next/link";
import { IconShieldCheck } from "@/components/icons";
import { RoleGate } from "@/components/role-gate";
import { SlipGenerator } from "@/components/slip-generator";
import { PageHeader } from "@/components/ui";
import { getSlipHistory, getUnits, getVerifiedDeposits } from "@/lib/queries";
import { todayISO } from "@/lib/utils";

import { requirePageRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["kasir", "admin"] as const;

function daysAgoISO(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export default async function SlipPage() {
  await requirePageRole([...ALLOWED_ROLES]);
  const today = todayISO();
  const [verified, trains, history] = await Promise.all([
    getVerifiedDeposits({ dari: daysAgoISO(75), sampai: today, limit: 500 }),
    getUnits(),
    getSlipHistory(8),
  ]);

  const rows = verified.map((row) => ({
    id: row.id,
    unitId: row.unitId,
    kodeSetoran: row.kodeSetoran,
    tanggalDinas: row.tanggalDinas,
    namaUnit: row.namaUnit,
    nomorUnit: row.nomorUnit,
    kategori: row.kategori,
    layanan: row.layanan,
    relasi: row.relasi,
    shift: row.shift,
    petugas: row.petugas,
    tunai: Number(row.tunai),
    nonTunai: Number(row.nonTunai),
    total: Number(row.total),
    verifikator: row.verifikator,
    verifiedAt: row.verifiedAt ? new Date(row.verifiedAt).toISOString() : null,
  }));

  return (
    <RoleGate
      allow={["kasir", "admin"]}
      moduleName="Slip Setoran Terverifikasi"
      description="Penerbitan slip resmi adalah kewenangan Kasir."
    >
    <div>
      <div className="print-hidden">
        <PageHeader
          eyebrow="Modul 4 · Rekapitulasi & Cetak"
          title="Kasir — Generator Slip Setoran Terverifikasi"
          description="Kewenangan Kasir: terbitkan slip resmi per tanggal, per KA, atau gabungan. Slip hanya memuat setoran berstatus Terverifikasi, lengkap dengan nomor referensi otomatis, QR validasi, dan terbilang."
          actions={
            <>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[0.72rem] font-semibold text-emerald-700">
                <IconShieldCheck size={14} /> {rows.length} data terverifikasi siap cetak
              </span>
              <Link
                href="/verifikasi"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50"
              >
                Verifikasi setoran
              </Link>
            </>
          }
        />
      </div>

      <SlipGenerator verifiedRows={rows} trains={trains} history={history} defaultTanggal={today} />
    </div>
    </RoleGate>
  );
}
