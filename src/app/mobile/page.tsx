import { CrewMobileForm } from "@/components/crew-mobile-form";
import { RoleGate } from "@/components/role-gate";
import { getDeposits, getUnits } from "@/lib/queries";
import { todayISO } from "@/lib/utils";

import { requirePageRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["crew", "sales", "admin"] as const;

export default async function MobileInputPage() {
  await requirePageRole([...ALLOWED_ROLES]);
  const today = todayISO();
  const [trains, todayDeposits] = await Promise.all([
    getUnits(),
    getDeposits({ dari: today, sampai: today, pageSize: 200 }),
  ]);

  const rows = todayDeposits.rows.map((row) => ({
    id: row.id,
    kodeSetoran: row.kodeSetoran,
    namaUnit: row.namaUnit,
    nomorUnit: row.nomorUnit,
    shift: row.shift,
    petugas: row.petugas,
    total: Number(row.total),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <RoleGate
      allow={["crew", "sales"]}
      moduleName="Input Setoran via HP"
      description="Halaman ini dioptimalkan untuk Crew di atas kereta maupun petugas parkir/cafe/booth: kamera, tombol besar, satu tangan."
    >
      <CrewMobileForm trains={trains} todayRows={rows} />
    </RoleGate>
  );
}
