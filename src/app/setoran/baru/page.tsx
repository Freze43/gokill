import { RoleGate } from "@/components/role-gate";
import { SetoranForm } from "@/components/setoran-form";
import { PageHeader } from "@/components/ui";
import { getUnits } from "@/lib/queries";

import { requirePageRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["sales", "crew", "admin"] as const;

export default async function InputSetoranPage({
  searchParams,
}: {
  searchParams: Promise<{ ka?: string }>;
}) {
  await requirePageRole([...ALLOWED_ROLES]);
  const params = await searchParams;
  const trains = await getUnits();
  const defaultKaId = params.ka && Number.isFinite(Number(params.ka)) ? Number(params.ka) : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Modul 2 · Pencatatan"
        title="Form Input Setoran Pendapatan"
        description="Form input untuk Sales (desktop) dan Crew — mencakup 63 KA, 13 titik parkir, 2 Loko Cafe, dan Booth Loko. Data tersimpan sebagai Menunggu Verifikasi dan langsung masuk kalender pendapatan."
      />
      <RoleGate
        allow={["sales", "crew"]}
        moduleName="Input Setoran (Desktop)"
        description="Penginputan setoran dilakukan oleh Sales & Crew. Kasir bertugas memverifikasi."
      >
        <SetoranForm trains={trains} defaultPetugas="" defaultKaId={defaultKaId} />
      </RoleGate>
    </div>
  );
}
