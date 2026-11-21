import { PengaturanForm } from "@/components/pengaturan-form";
import { RoleGate } from "@/components/role-gate";
import { getPengaturan } from "@/lib/queries";

import { requirePageRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin"] as const;

export default async function PengaturanPage() {
  await requirePageRole([...ALLOWED_ROLES]);
  const data = await getPengaturan();
  return (
    <RoleGate allow={["admin"]} moduleName="Pengaturan Unit & Peran" description="Pengaturan unit dan hak akses dikelola Admin.">
      <PengaturanForm pengaturan={data} />
    </RoleGate>
  );
}
