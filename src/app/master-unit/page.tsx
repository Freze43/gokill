import { MasterUnitEditor } from "@/components/master-unit-editor";
import { RoleGate } from "@/components/role-gate";
import { getUnits } from "@/lib/queries";

import { requirePageRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin"] as const;

export default async function MasterUnitPage() {
  await requirePageRole([...ALLOWED_ROLES]);
  const units = await getUnits();
  return (
    <RoleGate
      allow={["admin"]}
      moduleName="Master Unit Setoran"
      description="Hanya Admin yang boleh mengubah master KA, parkir, cafe, dan booth."
    >
      <MasterUnitEditor units={units} />
    </RoleGate>
  );
}
