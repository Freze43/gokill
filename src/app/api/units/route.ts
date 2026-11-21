import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { unitSetoran, setoran } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { getUnits } from "@/lib/queries";
import { requireRole } from "@/lib/auth";
import { KATEGORI_ORDER, KELAS_OPTIONS } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KELAS = KELAS_OPTIONS as readonly string[];
const KATEGORI = KATEGORI_ORDER as readonly string[];

function toNomor(value: unknown) {
  return String(value ?? "").replace(/[^\dA-Za-z]/g, "").trim().slice(0, 12);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rows = await getUnits(searchParams.get("kategori") ?? undefined);
    return Response.json({ ok: true, data: rows });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal memuat master unit" }, { status: 500 });
  }
}

type UnitInput = {
  kodeUnit?: string;
  namaUnit?: string;
  nomorUnit?: string;
  kategori?: string;
  relasi?: string;
  layanan?: string;
  statusAktif?: boolean;
};

function normalizeUnit(raw: UnitInput, index: number) {
  const kategori = String(raw.kategori ?? "ka");
  const namaUnit = String(raw.namaUnit ?? "").trim();
  const nomorUnit = toNomor(raw.nomorUnit) || String(index + 1);
  const layanan = String(raw.layanan ?? "").trim() || (kategori === "ka" ? "Ekonomi" : "Umum");
  const kodeUnit =
    String(raw.kodeUnit ?? "").trim() ||
    `${namaUnit.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "UNT"}-${nomorUnit}`;
  return {
    kodeUnit,
    namaUnit,
    nomorUnit,
    kategori,
    relasi: String(raw.relasi ?? "").trim(),
    layanan,
    statusAktif: raw.statusAktif !== false,
  };
}

function validateUnit(unit: ReturnType<typeof normalizeUnit>) {
  if (!unit.namaUnit) return "Nama unit wajib diisi";
  if (!KATEGORI.includes(unit.kategori as (typeof KATEGORI)[number])) return "Kategori unit tidak valid";
  if (!KELAS.includes(unit.layanan)) return `Jenis layanan "${unit.layanan}" tidak dikenal`;
  return null;
}

/**
 * POST /api/units
 * - Tunggal : { namaUnit, nomorUnit, kategori, relasi, layanan }
 * - Massal  : { items: [ {…}, {…} ] }  → daftar KA / parkir / outlet terbaru sekaligus
 */
export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;
  try {
    await ensureSeeded();
    const body = (await request.json()) as UnitInput & { items?: UnitInput[] };
    const inputs = Array.isArray(body.items) ? body.items : [body];
    if (inputs.length === 0) {
      return Response.json({ ok: false, message: "Tidak ada data yang dikirim" }, { status: 400 });
    }
    if (inputs.length > 200) {
      return Response.json({ ok: false, message: "Maksimal 200 unit per pengiriman" }, { status: 400 });
    }

    const existing = await db.select({ kodeUnit: unitSetoran.kodeUnit, nomorUnit: unitSetoran.nomorUnit, kategori: unitSetoran.kategori }).from(unitSetoran);
    const kodeSet = new Set(existing.map((row) => row.kodeUnit.toLowerCase()));
    const nomorSet = new Set(existing.map((row) => `${row.kategori}:${row.nomorUnit.toLowerCase()}`));

    const rows: Array<ReturnType<typeof normalizeUnit>> = [];
    const skipped: Array<{ namaUnit: string; alasan: string }> = [];
    const errors: string[] = [];

    inputs.forEach((raw, index) => {
      const unit = normalizeUnit(raw, index);
      const problem = validateUnit(unit);
      if (problem) {
        errors.push(`${unit.namaUnit || `baris ${index + 1}`}: ${problem}`);
        return;
      }
      if (kodeSet.has(unit.kodeUnit.toLowerCase())) {
        skipped.push({ namaUnit: unit.namaUnit, alasan: `Kode ${unit.kodeUnit} sudah dipakai` });
        return;
      }
      if (nomorSet.has(`${unit.kategori}:${unit.nomorUnit.toLowerCase()}`)) {
        skipped.push({ namaUnit: unit.namaUnit, alasan: `${unit.kategori.toUpperCase()} ${unit.nomorUnit} sudah ada` });
        return;
      }
      kodeSet.add(unit.kodeUnit.toLowerCase());
      nomorSet.add(`${unit.kategori}:${unit.nomorUnit.toLowerCase()}`);
      rows.push(unit);
    });

    if (rows.length === 0) {
      return Response.json(
        {
          ok: false,
          message: errors[0] ?? skipped[0]?.alasan ?? "Semua data sudah ada / tidak valid",
          skipped,
          errors,
        },
        { status: 409 },
      );
    }

    const created = await db.insert(unitSetoran).values(rows).returning();
    return Response.json(
      {
        ok: true,
        data: created.length === 1 ? created[0] : created,
        created: created.length,
        skipped,
        errors,
        message:
          created.length === 1
            ? `Unit ${created[0].namaUnit} berhasil ditambahkan`
            : `${created.length} unit berhasil ditambahkan${skipped.length ? `, ${skipped.length} dilewati` : ""}`,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("uniq") || message.includes("duplicate")) {
      return Response.json({ ok: false, message: "Kode unit sudah dipakai" }, { status: 409 });
    }
    console.error(error);
    return Response.json({ ok: false, message: "Gagal menambah unit" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;
  try {
    await ensureSeeded();
    const body = (await request.json()) as { items?: Array<Record<string, unknown>> };
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return Response.json({ ok: false, message: "Tidak ada perubahan" }, { status: 400 });
    }

    let updated = 0;
    const skipped: string[] = [];
    for (const item of items) {
      const id = Number(item.id);
      if (!Number.isFinite(id)) continue;
      const namaUnit = String(item.namaUnit ?? "").trim();
      const nomorUnit = toNomor(item.nomorUnit);
      const layanan = String(item.layanan ?? "");
      if (!namaUnit || !nomorUnit) {
        skipped.push(`ID ${id}: nama/nomor kosong`);
        continue;
      }
      if (!KELAS.includes(layanan)) {
        skipped.push(`${namaUnit}: jenis layanan "${layanan}" tidak dikenal`);
        continue;
      }

      const patch: Record<string, unknown> = {
        namaUnit,
        nomorUnit,
        kategori: KATEGORI.includes(String(item.kategori ?? "ka")) ? String(item.kategori) : "ka",
        layanan,
        relasi: String(item.relasi ?? "").trim(),
        statusAktif: item.statusAktif !== false,
        updatedAt: new Date(),
      };
      if (item.kodeUnit) patch.kodeUnit = String(item.kodeUnit).trim();

      const result = await db.update(unitSetoran).set(patch).where(eq(unitSetoran.id, id)).returning({ id: unitSetoran.id });
      updated += result.length;
    }

    if (updated === 0) {
      return Response.json(
        { ok: false, message: skipped[0] ?? "Tidak ada baris valid untuk disimpan", skipped },
        { status: 400 },
      );
    }
    return Response.json({ ok: true, updated, skipped, message: `${updated} data unit diperbarui` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("uniq") || message.includes("duplicate")) {
      return Response.json({ ok: false, message: "Kode unit duplikat. Periksa kembali kode yang Anda isi." }, { status: 409 });
    }
    console.error(error);
    return Response.json({ ok: false, message: "Gagal menyimpan master unit" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isFinite(id)) return Response.json({ ok: false, message: "ID tidak valid" }, { status: 400 });

    const [used] = await db
      .select({ jumlah: sql<number>`count(*)::int` })
      .from(setoran)
      .where(eq(setoran.unitId, id));
    if ((used?.jumlah ?? 0) > 0) {
      return Response.json(
        { ok: false, message: "Unit sudah memiliki riwayat setoran, nonaktifkan saja agar data tetap valid." },
        { status: 409 },
      );
    }

    await db.delete(unitSetoran).where(eq(unitSetoran.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal menghapus unit" }, { status: 500 });
  }
}
