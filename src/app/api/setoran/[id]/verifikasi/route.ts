import { eq } from "drizzle-orm";
import { db } from "@/db";
import { riwayatVerifikasi, setoran } from "@/db/schema";
import { getDepositById } from "@/lib/queries";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Aksi = "setujui" | "revisi";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(["kasir", "admin"]);
  if (!guard.ok) return guard.response;
  try {
    const { id } = await context.params;
    const setoranId = Number(id);
    if (!Number.isFinite(setoranId)) {
      return Response.json({ ok: false, message: "ID setoran tidak valid" }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const aksi = String(body.aksi ?? "") as Aksi;
    const verifikator = String(body.verifikator ?? "").trim() || guard.session.nama;
    const catatan = String(body.catatan ?? "").trim();
    const jenisSelisih = String(body.jenisSelisih ?? "").trim();
    const nominalSelisih = Math.round(Number(body.nominalSelisih) || 0);

    if (!verifikator) {
      return Response.json({ ok: false, message: "Nama verifikator wajib diisi" }, { status: 400 });
    }

    const [current] = await db.select().from(setoran).where(eq(setoran.id, setoranId)).limit(1);
    if (!current) return Response.json({ ok: false, message: "Setoran tidak ditemukan" }, { status: 404 });
    if (current.status === "terverifikasi") {
      return Response.json({ ok: false, message: "Setoran sudah terverifikasi" }, { status: 409 });
    }
    const penyelesaian = current.status === "selisih" && aksi === "setujui";

    const now = new Date();

    if (aksi === "setujui") {
      await db
        .update(setoran)
        .set({
          status: "terverifikasi",
          verifikator,
          verifiedAt: now,
          updatedAt: now,
          jenisSelisih: null,
          nominalSelisih: 0,
          catatanVerifikator: catatan || "Nominal dan bukti setor sesuai.",
        })
        .where(eq(setoran.id, setoranId));

      await db.insert(riwayatVerifikasi).values({
        setoranId,
        aksi: penyelesaian ? "selesaikan_selisih" : "setujui",
        statusSebelum: current.status,
        statusSesudah: "terverifikasi",
        aktor: verifikator,
        catatan: catatan || "Nominal dan bukti setor sesuai.",
      });
    } else if (aksi === "revisi") {
      if (jenisSelisih !== "kurang" && jenisSelisih !== "lebih") {
        return Response.json({ ok: false, message: "Jenis selisih harus Kurang atau Lebih" }, { status: 400 });
      }
      if (nominalSelisih <= 0) {
        return Response.json({ ok: false, message: "Nominal selisih harus lebih dari nol" }, { status: 400 });
      }
      if (catatan.length < 5) {
        return Response.json({ ok: false, message: "Catatan revisi wajib diisi (minimal 5 karakter)" }, { status: 400 });
      }

      await db
        .update(setoran)
        .set({
          status: "selisih",
          jenisSelisih,
          nominalSelisih,
          catatanVerifikator: catatan,
          verifikator,
          verifiedAt: now,
          updatedAt: now,
        })
        .where(eq(setoran.id, setoranId));

      await db.insert(riwayatVerifikasi).values({
        setoranId,
        aksi: "revisi",
        statusSebelum: current.status,
        statusSesudah: "selisih",
        aktor: verifikator,
        catatan: `Selisih ${jenisSelisih} Rp ${nominalSelisih.toLocaleString("id-ID")} — ${catatan}`,
      });
    } else {
      return Response.json({ ok: false, message: "Aksi tidak dikenal" }, { status: 400 });
    }

    const updated = await getDepositById(setoranId);
    const message =
      aksi === "setujui"
        ? penyelesaian
          ? "Selisih diselesaikan — setoran kini terverifikasi"
          : "Setoran terverifikasi"
        : "Setoran dikembalikan untuk revisi";
    return Response.json({ ok: true, data: updated, message });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal memproses verifikasi" }, { status: 500 });
  }
}
