import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { riwayatVerifikasi, setoran } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireRole(["kasir", "admin"]);
  if (!guard.ok) return guard.response;
  try {
    const body = (await request.json()) as { ids?: unknown; verifikator?: unknown; catatan?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : [];
    const verifikator = String(body.verifikator ?? "").trim() || guard.session.nama;
    const catatan = String(body.catatan ?? "").trim() || "Verifikasi massal — nominal & bukti sesuai.";

    if (!verifikator) {
      return Response.json({ ok: false, message: "Nama verifikator wajib diisi" }, { status: 400 });
    }
    if (ids.length === 0) {
      return Response.json({ ok: false, message: "Pilih minimal satu setoran" }, { status: 400 });
    }

    const targets = await db
      .select({ id: setoran.id })
      .from(setoran)
      .where(and(inArray(setoran.id, ids), eq(setoran.status, "menunggu")));

    if (targets.length === 0) {
      return Response.json({ ok: false, message: "Tidak ada setoran berstatus menunggu pada pilihan Anda" }, { status: 409 });
    }

    const now = new Date();
    await db
      .update(setoran)
      .set({
        status: "terverifikasi",
        verifikator,
        verifiedAt: now,
        updatedAt: now,
        jenisSelisih: null,
        nominalSelisih: 0,
        catatanVerifikator: catatan,
      })
      .where(
        and(
          inArray(
            setoran.id,
            targets.map((row) => row.id),
          ),
          eq(setoran.status, "menunggu"),
        ),
      );

    await db.insert(riwayatVerifikasi).values(
      targets.map((row) => ({
        setoranId: row.id,
        aksi: "setujui_massal",
        statusSebelum: "menunggu",
        statusSesudah: "terverifikasi",
        aktor: verifikator,
        catatan,
      })),
    );

    return Response.json({ ok: true, count: targets.length, message: `${targets.length} setoran berhasil diverifikasi` });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal memproses verifikasi massal" }, { status: 500 });
  }
}
