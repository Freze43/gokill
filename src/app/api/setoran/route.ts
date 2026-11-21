import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { unitSetoran, riwayatVerifikasi, setoran } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { requireRole } from "@/lib/auth";
import { getDeposits } from "@/lib/queries";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getDeposits({
      dari: searchParams.get("dari") ?? undefined,
      sampai: searchParams.get("sampai") ?? undefined,
      unitId: searchParams.get("unitId") ? Number(searchParams.get("unitId")) : undefined,
      kategori: searchParams.get("kategori") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 25,
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal memuat setoran" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireRole(["sales", "crew", "admin"]);
  if (!guard.ok) return guard.response;
  try {
    await ensureSeeded();
    const body = (await request.json()) as Record<string, unknown>;
    const tanggalDinas = String(body.tanggalDinas ?? "");
    const unitId = Number(body.unitId);
    const petugas = String(body.petugas ?? "").trim();
    const shift = String(body.shift ?? "Pagi");
    const tunai = Math.max(0, Math.round(Number(body.tunai) || 0));
    const nonTunai = Math.max(0, Math.round(Number(body.nonTunai) || 0));
    const buktiData = typeof body.buktiData === "string" ? body.buktiData : null;
    const buktiTipe = typeof body.buktiTipe === "string" ? body.buktiTipe : "demo";
    const buktiNama = typeof body.buktiNama === "string" ? body.buktiNama : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalDinas)) {
      return Response.json({ ok: false, message: "Tanggal dinas tidak valid" }, { status: 400 });
    }
    if (tanggalDinas > todayISO()) {
      return Response.json({ ok: false, message: "Tanggal dinas tidak boleh melebihi hari ini" }, { status: 400 });
    }
    if (!Number.isFinite(unitId) || unitId <= 0) {
      return Response.json({ ok: false, message: "Pilih unit setoran (KA / parkir / cafe / booth) terlebih dahulu" }, { status: 400 });
    }
    if (!petugas) {
      return Response.json({ ok: false, message: "Nama petugas penyetor wajib diisi" }, { status: 400 });
    }
    if (tunai + nonTunai <= 0) {
      return Response.json({ ok: false, message: "Nominal setoran harus lebih dari nol" }, { status: 400 });
    }
    if (buktiData && buktiData.length > 3_000_000) {
      return Response.json({ ok: false, message: "Ukuran bukti terlalu besar (maks ±2 MB)" }, { status: 413 });
    }

    const [train] = await db.select().from(unitSetoran).where(eq(unitSetoran.id, unitId)).limit(1);
    if (!train) return Response.json({ ok: false, message: "Unit setoran tidak ditemukan" }, { status: 404 });

    const [existing] = await db
      .select({ id: setoran.id })
      .from(setoran)
      .where(and(eq(setoran.unitId, unitId), eq(setoran.tanggalDinas, tanggalDinas)))
      .limit(1);
    if (existing) {
      return Response.json(
        { ok: false, message: `Setoran ${train.namaUnit} untuk tanggal tersebut sudah ada. Gunakan menu data setoran untuk memeriksa.` },
        { status: 409 },
      );
    }

    // Nomor urut diambil dari kode terbesar pada tanggal tersebut agar tidak bentrok
    // ketika ada baris yang dihapus / dibatalkan.
    const [counter] = await db
      .select({
        maxSeq: sql<number>`coalesce(max(nullif(regexp_replace(${setoran.kodeSetoran}, '^.*-', ''), '')::int), 0)`,
      })
      .from(setoran)
      .where(eq(setoran.tanggalDinas, tanggalDinas));
    const kodeSetoran = `STR-${tanggalDinas.replace(/-/g, "")}-${String((counter?.maxSeq ?? 0) + 1).padStart(3, "0")}`;

    const [row] = await db
      .insert(setoran)
      .values({
        kodeSetoran,
        tanggalDinas,
        unitId,
        shift,
        petugas,
        tunai,
        nonTunai,
        total: tunai + nonTunai,
        buktiNama,
        buktiTipe,
        buktiData,
        status: "menunggu",
        dibuatOleh: guard.session.nama,
        catatanPetugas: typeof body.catatanPetugas === "string" ? body.catatanPetugas : null,
      })
      .returning();

    await db.insert(riwayatVerifikasi).values({
      setoranId: row.id,
      aksi: "dibuat",
      statusSebelum: "-",
      statusSesudah: "menunggu",
      aktor: petugas,
      catatan: `Setoran baru diinput oleh ${petugas}`,
    });

    return Response.json({ ok: true, data: row }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("uniq") || message.includes("duplicate")) {
      return Response.json({ ok: false, message: "Setoran unit ini pada tanggal tersebut sudah tercatat" }, { status: 409 });
    }
    console.error(error);
    return Response.json({ ok: false, message: "Gagal menyimpan setoran" }, { status: 500 });
  }
}
