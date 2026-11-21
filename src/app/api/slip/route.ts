import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { unitSetoran, setoran, slipSetoran } from "@/db/schema";
import { getPengaturan, getVerifiedByIds } from "@/lib/queries";
import { requireRole } from "@/lib/auth";
import type { SlipRow, SlipSnapshot } from "@/lib/slip";
import { terbilangRupiah, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: slipSetoran.id,
        nomorReferensi: slipSetoran.nomorReferensi,
        token: slipSetoran.token,
        jenis: slipSetoran.jenis,
        periodeMulai: slipSetoran.periodeMulai,
        periodeSelesai: slipSetoran.periodeSelesai,
        jumlahTransaksi: slipSetoran.jumlahTransaksi,
        grandTotal: slipSetoran.grandTotal,
        dicetakOleh: slipSetoran.dicetakOleh,
        createdAt: slipSetoran.createdAt,
      })
      .from(slipSetoran)
      .orderBy(desc(slipSetoran.createdAt))
      .limit(20);
    return Response.json({ ok: true, data: rows });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal memuat riwayat slip" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireRole(["kasir", "admin"]);
  if (!guard.ok) return guard.response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const jenis = String(body.jenis ?? "");
    const dicetakOleh = String(body.dicetakOleh ?? "").trim() || guard.session.nama;
    if (!["harian", "per_unit", "per_ka", "gabungan"].includes(jenis)) {
      return Response.json({ ok: false, message: "Jenis slip tidak valid" }, { status: 400 });
    }

    let rows: SlipRow[] = [];
    let periodeMulai = todayISO();
    let periodeSelesai = todayISO();
    let unitId: number | null = null;

    if (jenis === "harian") {
      const tanggal = String(body.tanggal ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
        return Response.json({ ok: false, message: "Tanggal slip tidak valid" }, { status: 400 });
      }
      const data = await db
        .select({
          id: setoran.id,
          tanggalDinas: setoran.tanggalDinas,
          nomorUnit: unitSetoran.nomorUnit,
          kodeUnit: unitSetoran.kodeUnit,
          namaUnit: unitSetoran.namaUnit,
          kategori: unitSetoran.kategori,
          layanan: unitSetoran.layanan,
          relasi: unitSetoran.relasi,
          shift: setoran.shift,
          petugas: setoran.petugas,
          tunai: setoran.tunai,
          nonTunai: setoran.nonTunai,
          total: setoran.total,
          verifikator: setoran.verifikator,
          verifiedAt: setoran.verifiedAt,
        })
        .from(setoran)
        .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
        .where(and(eq(setoran.status, "terverifikasi"), eq(setoran.tanggalDinas, tanggal)))
        .orderBy(asc(sql`length(${unitSetoran.nomorUnit})`), asc(unitSetoran.nomorUnit));
      rows = data.map((row) => ({ ...row, verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null }));
      periodeMulai = tanggal;
      periodeSelesai = tanggal;
    } else if (jenis === "per_unit" || jenis === "per_ka") {
      unitId = Number(body.unitId);
      const dari = String(body.dari ?? "");
      const sampai = String(body.sampai ?? "");
      if (!Number.isFinite(unitId) || !/^\d{4}-\d{2}-\d{2}$/.test(dari) || !/^\d{4}-\d{2}-\d{2}$/.test(sampai)) {
        return Response.json({ ok: false, message: "Parameter rekap per unit tidak lengkap" }, { status: 400 });
      }
      const data = await db
        .select({
          id: setoran.id,
          tanggalDinas: setoran.tanggalDinas,
          nomorUnit: unitSetoran.nomorUnit,
          kodeUnit: unitSetoran.kodeUnit,
          namaUnit: unitSetoran.namaUnit,
          kategori: unitSetoran.kategori,
          layanan: unitSetoran.layanan,
          relasi: unitSetoran.relasi,
          shift: setoran.shift,
          petugas: setoran.petugas,
          tunai: setoran.tunai,
          nonTunai: setoran.nonTunai,
          total: setoran.total,
          verifikator: setoran.verifikator,
          verifiedAt: setoran.verifiedAt,
        })
        .from(setoran)
        .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
        .where(
          and(
            eq(setoran.status, "terverifikasi"),
            eq(setoran.unitId, unitId),
            gte(setoran.tanggalDinas, dari),
            lte(setoran.tanggalDinas, sampai),
          ),
        )
        .orderBy(asc(setoran.tanggalDinas));
      rows = data.map((row) => ({ ...row, verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null }));
      periodeMulai = dari;
      periodeSelesai = sampai;
    } else {
      const ids = Array.isArray(body.setoranIds)
        ? (body.setoranIds as unknown[]).map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [];
      if (ids.length === 0) {
        return Response.json({ ok: false, message: "Pilih minimal satu setoran terverifikasi" }, { status: 400 });
      }
      const data = await getVerifiedByIds(ids);
      if (data.length !== ids.length) {
        return Response.json(
          { ok: false, message: "Sebagian data tidak berstatus terverifikasi sehingga tidak dapat dicetak" },
          { status: 400 },
        );
      }
      rows = data.map((row) => ({
        id: row.id,
        tanggalDinas: row.tanggalDinas,
        nomorUnit: row.nomorUnit,
        kodeUnit: row.kodeUnit,
        namaUnit: row.namaUnit,
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
      periodeMulai = rows.reduce((min, row) => (row.tanggalDinas < min ? row.tanggalDinas : min), rows[0].tanggalDinas);
      periodeSelesai = rows.reduce((max, row) => (row.tanggalDinas > max ? row.tanggalDinas : max), rows[0].tanggalDinas);
    }

    if (rows.length === 0) {
      return Response.json(
        { ok: false, message: "Tidak ada setoran TERVERIFIKASI pada parameter tersebut. Slip hanya dapat dibuat dari data terverifikasi." },
        { status: 404 },
      );
    }

    const pengaturan = await getPengaturan();
    const totalTunai = rows.reduce((sum, row) => sum + Number(row.tunai), 0);
    const totalNonTunai = rows.reduce((sum, row) => sum + Number(row.nonTunai), 0);
    const grandTotal = totalTunai + totalNonTunai;

    const tanggalCetak = todayISO();
    const kategoriUnik = new Set(rows.map((row) => row.kategori));
    const kategoriTunggal = kategoriUnik.size === 1 ? rows[0]?.kategori : "campuran";
    const prefixKategori =
      kategoriTunggal === "parkir"
        ? "PRK"
        : kategoriTunggal === "cafe"
          ? "CFE"
          : kategoriTunggal === "booth"
            ? "BTH"
            : kategoriTunggal === "ka"
              ? "KA"
              : "ALL";
    const prefix = `SLP/${prefixKategori}/${tanggalCetak.replace(/-/g, "")}`;
    const [counter] = await db
      .select({ jumlah: sql<number>`count(*)::int` })
      .from(slipSetoran)
      .where(like(slipSetoran.nomorReferensi, `${prefix}/%`));
    const nomorReferensi = `${prefix}/${String((counter?.jumlah ?? 0) + 1).padStart(3, "0")}`;
    const token = randomBytes(9).toString("hex");

    const snapshot: SlipSnapshot = {
      unit: {
        namaUnit: pengaturan.namaUnit,
        alamatUnit: pengaturan.alamatUnit,
        namaKepalaUnit: pengaturan.namaKepalaUnit,
        namaVerifikator: pengaturan.namaVerifikator,
      },
      rows,
      totalTunai,
      totalNonTunai,
      grandTotal,
      terbilang: terbilangRupiah(grandTotal),
      jumlah: rows.length,
    };

    const [created] = await db
      .insert(slipSetoran)
      .values({
        nomorReferensi,
        token,
        jenis,
        periodeMulai,
        periodeSelesai,
        unitId,
        kategori: kategoriUnik.size === 1 ? rows[0]?.kategori ?? null : "campuran",
        jumlahTransaksi: rows.length,
        grandTotal,
        terbilang: snapshot.terbilang,
        dicetakOleh,
        snapshot,
      })
      .returning();

    return Response.json(
      {
        ok: true,
        data: {
          ...created,
          createdAt: created.createdAt.toISOString(),
          snapshot,
        },
        message: `Slip ${nomorReferensi} berhasil diterbitkan`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal membuat slip setoran" }, { status: 500 });
  }
}
