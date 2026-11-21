import { sql } from "drizzle-orm";
import { db } from "@/db";
import { unitSetoran, pengaturan, setoran, pengguna } from "@/db/schema";
import { PETUGAS_NON_KA, PETUGAS_SEED, UNIT_SEED } from "@/lib/trains-data";
import { hashPassword } from "@/lib/auth";

export const DEFAULT_PENGATURAN = {
  namaUnit: "PT Kereta Api Indonesia (Persero) — Daerah Operasi 4 Semarang",
  alamatUnit: "Jl. Stasiun Tawang No. 1, Semarang 50136 · Unit Pendapatan & Verifikasi",
  namaKepalaUnit: "Dedi Kurniawan",
  namaVerifikator: "Rani Puspita",
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seedUnits() {
  const existing = await db.select({ kodeUnit: unitSetoran.kodeUnit }).from(unitSetoran);
  const codes = new Set(existing.map((row) => row.kodeUnit));
  const missing = UNIT_SEED.filter((unit) => !codes.has(unit.kodeUnit));
  if (missing.length === 0) return;
  await db.insert(unitSetoran).values(missing).onConflictDoNothing();
}

async function seedPengaturan() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(pengaturan);
  if (count > 0) return;
  await db.insert(pengaturan).values(DEFAULT_PENGATURAN);
}

/** Nominal contoh sesuai karakter tiap kategori unit. */
function nominalFor(kategori: string, random: () => number) {
  if (kategori === "parkir") {
    const tunai = 300_000 + Math.floor(random() * 46) * 10_000;
    const nonTunai = random() > 0.55 ? 50_000 + Math.floor(random() * 16) * 10_000 : 0;
    return { tunai, nonTunai };
  }
  if (kategori === "cafe") {
    const tunai = 1_400_000 + Math.floor(random() * 70) * 50_000;
    const nonTunai = 800_000 + Math.floor(random() * 45) * 50_000;
    return { tunai, nonTunai };
  }
  if (kategori === "booth") {
    const tunai = 450_000 + Math.floor(random() * 55) * 25_000;
    const nonTunai = 150_000 + Math.floor(random() * 25) * 25_000;
    return { tunai, nonTunai };
  }
  const tunai = 1_450_000 + Math.floor(random() * 215) * 100_000;
  const nonTunai = random() > 0.22 ? 350_000 + Math.floor(random() * 95) * 50_000 : 0;
  return { tunai, nonTunai };
}

/**
 * Seed 2 bulan transaksi untuk seluruh unit:
 * 63 KA (subset acak 41–63 per hari) + 13 Parkir + 2 Loko Cafe + 1 Booth (setiap hari).
 */
async function seedSetoran() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(setoran);
  if (count > 0) return;

  const units = await db
    .select({ id: unitSetoran.id, nomorUnit: unitSetoran.nomorUnit, kategori: unitSetoran.kategori })
    .from(unitSetoran)
    .orderBy(unitSetoran.id);
  if (units.length === 0) return;

  const kaUnits = units.filter((unit) => unit.kategori === "ka");
  const nonKaUnits = units.filter((unit) => unit.kategori !== "ka");

  const jakarta = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const [ty, tm] = jakarta.split("-").map(Number);
  const todayDate = new Date(Date.UTC(ty, tm - 1, Number(jakarta.slice(8, 10))));
  const startOfPrev = new Date(Date.UTC(ty, tm - 2, 1));

  const rows: Array<typeof setoran.$inferInsert> = [];
  let sequence = 0;

  for (let offset = 0; offset < 62; offset += 1) {
    const day = new Date(startOfPrev.getTime() + offset * 86_400_000);
    if (day > todayDate) break;
    const tanggal = isoDate(day);
    const random = mulberry32(Number(tanggal.replace(/-/g, "")));
    const daysAgo = Math.round((todayDate.getTime() - day.getTime()) / 86_400_000);

    const kaCount = 41 + Math.floor(random() * Math.min(23, Math.max(1, kaUnits.length - 40)));
    const shuffledKa = [...kaUnits].sort((a, b) => {
      const ha = Math.sin(Number(a.id) * 12.9898 + Number(tanggal.slice(8, 10))) * 43758.5453;
      const hb = Math.sin(Number(b.id) * 12.9898 + Number(tanggal.slice(8, 10))) * 43758.5453;
      return ha - Math.floor(ha) - (hb - Math.floor(hb));
    });
    const picked = [...shuffledKa.slice(0, Math.min(kaCount, kaUnits.length)), ...nonKaUnits];

    picked.forEach((unit, index) => {
      const { tunai, nonTunai } = nominalFor(unit.kategori, random);
      const total = tunai + nonTunai;
      const roll = random();
      let status = "terverifikasi";
      let jenisSelisih: string | null = null;
      let nominalSelisih = 0;
      let catatanVerifikator: string | null = null;
      let verifikator: string | null = "Rani Puspita";

      if (daysAgo <= 2) {
        status = roll > 0.34 ? "menunggu" : roll > 0.12 ? "terverifikasi" : "selisih";
      } else if (roll > 0.93) {
        status = "menunggu";
      } else if (roll > 0.87) {
        status = "selisih";
      }

      if (status === "menunggu") {
        verifikator = null;
      } else if (status === "selisih") {
        jenisSelisih = roll > 0.5 ? "kurang" : "lebih";
        nominalSelisih = (1 + Math.floor(random() * 5)) * 25_000;
        catatanVerifikator =
          jenisSelisih === "kurang"
            ? `Bukti setor lebih kecil ${new Intl.NumberFormat("id-ID").format(nominalSelisih)} dari nominal input. Mohon perbaiki & setor kekurangan.`
            : `Bukti setor lebih besar ${new Intl.NumberFormat("id-ID").format(nominalSelisih)} dari nominal input. Mohon konfirmasi ulang.`;
      }

      const pool = unit.kategori === "ka" ? PETUGAS_SEED : PETUGAS_NON_KA;
      const petugas = pool[(Number(unit.id) + index) % pool.length];
      const verifiedAt =
        status === "menunggu"
          ? null
          : new Date(day.getTime() + 86_400_000 + (5 + Math.floor(random() * 9)) * 3_600_000);

      sequence += 1;
      rows.push({
        kodeSetoran: `STR-${tanggal.replace(/-/g, "")}-${String(sequence).padStart(4, "0")}`,
        tanggalDinas: tanggal,
        unitId: unit.id,
        shift: unit.kategori === "ka" ? (random() > 0.66 ? "Siang" : random() > 0.45 ? "Malam" : "Pagi") : "Pagi",
        petugas,
        tunai,
        nonTunai,
        total,
        buktiTipe: "demo",
        buktiNama: `resi-${unit.nomorUnit}-${tanggal}.jpg`,
        buktiData: `/api/bukti-demo?nomor=${encodeURIComponent(unit.nomorUnit)}&tanggal=${tanggal}&tunai=${tunai}&nontunai=${nonTunai}`,
        status,
        jenisSelisih,
        nominalSelisih,
        catatanVerifikator,
        verifikator,
        verifiedAt,
        dibuatOleh: petugas,
      });
    });
  }

  for (let i = 0; i < rows.length; i += 300) {
    await db
      .insert(setoran)
      .values(rows.slice(i, i + 300))
      .onConflictDoNothing();
  }
}

export const DEMO_ACCOUNTS = [
  { nama: "Admin SIVERA", email: "admin@sivera.id", role: "admin" },
  { nama: "Andi Pratama", email: "sales@sivera.id", role: "sales" },
  { nama: "Bagus Nugroho", email: "crew@sivera.id", role: "crew" },
  { nama: "Rani Puspita", email: "kasir@sivera.id", role: "kasir" },
];

export const DEMO_PASSWORD = "sivera123";

/** Seed akun demo untuk 4 peran (password: sivera123). */
async function seedPengguna() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(pengguna);
  if (count > 0) return;
  const passwordHash = hashPassword(DEMO_PASSWORD);
  await db
    .insert(pengguna)
    .values(DEMO_ACCOUNTS.map((account) => ({ ...account, passwordHash })))
    .onConflictDoNothing();
}

let seedingPromise: Promise<void> | null = null;

export async function ensureSeeded() {
  if (!seedingPromise) {
    seedingPromise = (async () => {
      await seedUnits();
      await seedPengaturan();
      await seedPengguna();
      await seedSetoran();
    })().catch((error) => {
      seedingPromise = null;
      console.error("[seed] gagal menyiapkan data awal", error);
    }) as Promise<void>;
  }
  await seedingPromise;
}
