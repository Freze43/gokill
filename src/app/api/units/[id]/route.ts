import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { unitSetoran } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await context.params;
    const trainId = Number(id);
    if (!Number.isFinite(trainId)) {
      return Response.json({ ok: false, message: "ID tidak valid" }, { status: 400 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (body.namaUnit !== undefined) patch.namaUnit = String(body.namaUnit).trim();
    if (body.nomorUnit !== undefined) patch.nomorUnit = String(body.nomorUnit).replace(/[^\dA-Za-z]/g, "").slice(0, 12);
    if (body.relasi !== undefined) patch.relasi = String(body.relasi).trim();
    if (body.layanan !== undefined) patch.layanan = String(body.layanan);
    if (body.kodeUnit !== undefined) patch.kodeUnit = String(body.kodeUnit).trim();
    if (body.kategori !== undefined) patch.kategori = String(body.kategori);
    if (body.statusAktif !== undefined) patch.statusAktif = Boolean(body.statusAktif);

    const [row] = await db.update(unitSetoran).set(patch).where(eq(unitSetoran.id, trainId)).returning();
    if (!row) return Response.json({ ok: false, message: "Unit tidak ditemukan" }, { status: 404 });
    return Response.json({ ok: true, data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("uniq") || message.includes("duplicate")) {
      return Response.json({ ok: false, message: "Kode unit sudah dipakai" }, { status: 409 });
    }
    console.error(error);
    return Response.json({ ok: false, message: "Gagal menyimpan" }, { status: 500 });
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const rows = await db
    .select()
    .from(unitSetoran)
    .where(and(eq(unitSetoran.id, Number(id))))
    .limit(1);
  if (!rows[0]) return Response.json({ ok: false, message: "Tidak ditemukan" }, { status: 404 });
  return Response.json({ ok: true, data: rows[0] });
}
