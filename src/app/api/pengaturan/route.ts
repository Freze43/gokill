import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pengaturan } from "@/db/schema";
import { getPengaturan } from "@/lib/queries";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getPengaturan();
    return Response.json({ ok: true, data });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal memuat pengaturan" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const payload = {
      namaUnit: String(body.namaUnit ?? "").trim(),
      alamatUnit: String(body.alamatUnit ?? "").trim(),
      namaKepalaUnit: String(body.namaKepalaUnit ?? "").trim(),
      namaVerifikator: String(body.namaVerifikator ?? "").trim(),
      updatedAt: new Date(),
    };
    if (!payload.namaUnit) {
      return Response.json({ ok: false, message: "Nama unit wajib diisi" }, { status: 400 });
    }

    const existing = await db.select({ id: pengaturan.id }).from(pengaturan).orderBy(asc(pengaturan.id)).limit(1);
    if (existing[0]) {
      await db.update(pengaturan).set(payload).where(eq(pengaturan.id, existing[0].id));
    } else {
      await db.insert(pengaturan).values(payload);
    }

    const data = await getPengaturan();
    return Response.json({ ok: true, data, message: "Pengaturan unit disimpan" });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
