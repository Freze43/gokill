import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { unitSetoran, pengaturan, setoran, slipSetoran, riwayatVerifikasi } from "@/db/schema";
import { DEFAULT_PENGATURAN, ensureSeeded } from "@/lib/seed";
import type { StatusSetoran } from "@/lib/utils";

export type PengaturanData = typeof pengaturan.$inferSelect;

export async function getPengaturan(): Promise<PengaturanData> {
  await ensureSeeded();
  const rows = await db.select().from(pengaturan).orderBy(asc(pengaturan.id)).limit(1);
  if (rows[0]) return rows[0];
  return {
    id: 0,
    ...DEFAULT_PENGATURAN,
    updatedAt: new Date(),
  };
}

export type UnitRow = Awaited<ReturnType<typeof getUnits>>[number];

export async function getUnits(kategori?: string) {
  await ensureSeeded();
  const where = kategori && kategori !== "semua" ? eq(unitSetoran.kategori, kategori) : undefined;
  return db
    .select({
      id: unitSetoran.id,
      kodeUnit: unitSetoran.kodeUnit,
      namaUnit: unitSetoran.namaUnit,
      nomorUnit: unitSetoran.nomorUnit,
      kategori: unitSetoran.kategori,
      relasi: unitSetoran.relasi,
      layanan: unitSetoran.layanan,
      statusAktif: unitSetoran.statusAktif,
      jumlahSetoran: sql<number>`(select count(*)::int from ${setoran} where ${setoran.unitId} = ${unitSetoran.id})`,
    })
    .from(unitSetoran)
    .where(where)
    .orderBy(
      asc(sql`case ${unitSetoran.kategori} when 'ka' then 1 when 'parkir' then 2 when 'cafe' then 3 else 4 end`),
      asc(sql`length(${unitSetoran.nomorUnit})`),
      asc(unitSetoran.nomorUnit),
      asc(unitSetoran.id),
    );
}

export type DepositFilters = {
  dari?: string;
  sampai?: string;
  unitId?: number;
  kategori?: string;
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: "terbaru" | "nominal";
};

export type DepositRow = {
  id: number;
  kodeSetoran: string;
  tanggalDinas: string;
  unitId: number;
  kategori: string;
  shift: string;
  petugas: string;
  tunai: number;
  nonTunai: number;
  total: number;
  buktiNama: string | null;
  buktiTipe: string;
  buktiData: string | null;
  status: string;
  jenisSelisih: string | null;
  nominalSelisih: number;
  catatanVerifikator: string | null;
  verifikator: string | null;
  verifiedAt: Date | null;
  dibuatOleh: string;
  createdAt: Date;
  namaUnit: string;
  nomorUnit: string;
  kodeUnit: string;
  relasi: string;
  layanan: string;
};

const depositSelection = {
  id: setoran.id,
  kodeSetoran: setoran.kodeSetoran,
  tanggalDinas: setoran.tanggalDinas,
  unitId: setoran.unitId,
  kategori: unitSetoran.kategori,
  shift: setoran.shift,
  petugas: setoran.petugas,
  tunai: setoran.tunai,
  nonTunai: setoran.nonTunai,
  total: setoran.total,
  buktiNama: setoran.buktiNama,
  buktiTipe: setoran.buktiTipe,
  buktiData: setoran.buktiData,
  status: setoran.status,
  jenisSelisih: setoran.jenisSelisih,
  nominalSelisih: setoran.nominalSelisih,
  catatanVerifikator: setoran.catatanVerifikator,
  verifikator: setoran.verifikator,
  verifiedAt: setoran.verifiedAt,
  dibuatOleh: setoran.dibuatOleh,
  createdAt: setoran.createdAt,
  namaUnit: unitSetoran.namaUnit,
  nomorUnit: unitSetoran.nomorUnit,
  kodeUnit: unitSetoran.kodeUnit,
  relasi: unitSetoran.relasi,
  layanan: unitSetoran.layanan,
};

function buildWhere(filters: DepositFilters) {
  const conditions = [];
  if (filters.dari) conditions.push(gte(setoran.tanggalDinas, filters.dari));
  if (filters.sampai) conditions.push(lte(setoran.tanggalDinas, filters.sampai));
  if (filters.unitId) conditions.push(eq(setoran.unitId, filters.unitId));
  if (filters.kategori && filters.kategori !== "semua") conditions.push(eq(unitSetoran.kategori, filters.kategori));
  if (filters.status && filters.status !== "semua") conditions.push(eq(setoran.status, filters.status));
  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(unitSetoran.namaUnit, term),
        ilike(unitSetoran.nomorUnit, term),
        ilike(unitSetoran.kodeUnit, term),
        ilike(setoran.petugas, term),
        ilike(setoran.kodeSetoran, term),
      ),
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function getDeposits(filters: DepositFilters = {}) {
  await ensureSeeded();
  const where = buildWhere(filters);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 200);
  const page = Math.max(filters.page ?? 1, 1);
  const order =
    filters.sort === "nominal"
      ? [desc(setoran.total)]
      : [desc(setoran.tanggalDinas), desc(setoran.createdAt)];

  const rows = (await db
    .select(depositSelection)
    .from(setoran)
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .where(where)
    .orderBy(...order)
    .limit(pageSize)
    .offset((page - 1) * pageSize)) as DepositRow[];

  const [summary] = await db
    .select({
      jumlah: sql<number>`count(*)::int`,
      tunai: sql<number>`coalesce(sum(${setoran.tunai}), 0)::double precision`,
      nonTunai: sql<number>`coalesce(sum(${setoran.nonTunai}), 0)::double precision`,
      total: sql<number>`coalesce(sum(${setoran.total}), 0)::double precision`,
      menunggu: sql<number>`count(*) filter (where ${setoran.status} = 'menunggu')::int`,
      terverifikasi: sql<number>`count(*) filter (where ${setoran.status} = 'terverifikasi')::int`,
      selisih: sql<number>`count(*) filter (where ${setoran.status} = 'selisih')::int`,
    })
    .from(setoran)
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .where(where);

  return { rows, summary, page, pageSize, totalPages: Math.max(1, Math.ceil(summary.jumlah / pageSize)) };
}

export async function getDepositById(id: number) {
  const rows = (await db
    .select(depositSelection)
    .from(setoran)
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .where(eq(setoran.id, id))
    .limit(1)) as DepositRow[];
  return rows[0] ?? null;
}

export type DayAggregate = {
  tanggal: string;
  jumlah: number;
  total: number;
  tunai: number;
  nonTunai: number;
  terverifikasi: number;
  menunggu: number;
  selisih: number;
  verifiedTotal: number;
};

export async function getCalendarMonth(bulan: string, totalUnit: number) {
  await ensureSeeded();
  const dari = `${bulan}-01`;
  const [y, m] = bulan.split("-").map(Number);
  const akhir = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const sampai = `${bulan}-${String(akhir).padStart(2, "0")}`;

  const rows = await db
    .select({
      tanggal: setoran.tanggalDinas,
      jumlah: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${setoran.total}), 0)::double precision`,
      tunai: sql<number>`coalesce(sum(${setoran.tunai}), 0)::double precision`,
      nonTunai: sql<number>`coalesce(sum(${setoran.nonTunai}), 0)::double precision`,
      terverifikasi: sql<number>`count(*) filter (where ${setoran.status} = 'terverifikasi')::int`,
      menunggu: sql<number>`count(*) filter (where ${setoran.status} = 'menunggu')::int`,
      selisih: sql<number>`count(*) filter (where ${setoran.status} = 'selisih')::int`,
      verifiedTotal: sql<number>`coalesce(sum(${setoran.total}) filter (where ${setoran.status} = 'terverifikasi'), 0)::double precision`,
    })
    .from(setoran)
    .where(and(gte(setoran.tanggalDinas, dari), lte(setoran.tanggalDinas, sampai)))
    .groupBy(setoran.tanggalDinas)
    .orderBy(asc(setoran.tanggalDinas));

  const days: Record<string, DayAggregate> = {};
  for (const row of rows) {
    days[row.tanggal] = { ...row, tanggal: row.tanggal } as DayAggregate;
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.jumlah += row.jumlah;
      acc.total += Number(row.total);
      acc.tunai += Number(row.tunai);
      acc.nonTunai += Number(row.nonTunai);
      acc.terverifikasi += row.terverifikasi;
      acc.menunggu += row.menunggu;
      acc.selisih += row.selisih;
      acc.verifiedTotal += Number(row.verifiedTotal);
      return acc;
    },
    { jumlah: 0, total: 0, tunai: 0, nonTunai: 0, terverifikasi: 0, menunggu: 0, selisih: 0, verifiedTotal: 0 },
  );

  return { bulan, dari, sampai, totalUnit, days, totals };
}

export async function getDayDetail(tanggal: string) {
  return db
    .select(depositSelection)
    .from(setoran)
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .where(eq(setoran.tanggalDinas, tanggal))
    .orderBy(asc(sql`length(${unitSetoran.nomorUnit})`), asc(unitSetoran.nomorUnit), asc(unitSetoran.id)) as Promise<DepositRow[]>;
}

export type KategoriSummary = {
  kategori: string;
  unit: number;
  transaksi: number;
  total: number;
  tunai: number;
  nonTunai: number;
  terverifikasi: number;
  menunggu: number;
};

/** Rekap pendapatan per kategori unit (KA / Parkir / Cafe / Booth). */
export async function getKategoriSummary(dari: string, sampai: string): Promise<KategoriSummary[]> {
  await ensureSeeded();
  const rows = await db
    .select({
      kategori: unitSetoran.kategori,
      unit: sql<number>`count(distinct ${setoran.unitId})::int`,
      transaksi: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${setoran.total}), 0)::double precision`,
      tunai: sql<number>`coalesce(sum(${setoran.tunai}), 0)::double precision`,
      nonTunai: sql<number>`coalesce(sum(${setoran.nonTunai}), 0)::double precision`,
      terverifikasi: sql<number>`count(*) filter (where ${setoran.status} = 'terverifikasi')::int`,
      menunggu: sql<number>`count(*) filter (where ${setoran.status} = 'menunggu')::int`,
    })
    .from(setoran)
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .where(and(gte(setoran.tanggalDinas, dari), lte(setoran.tanggalDinas, sampai)))
    .groupBy(unitSetoran.kategori);

  const order = ["ka", "parkir", "cafe", "booth"];
  return rows.sort((a, b) => order.indexOf(a.kategori) - order.indexOf(b.kategori));
}

export async function getDashboardData() {
  await ensureSeeded();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const bulan = today.slice(0, 7);
  const [y, m] = bulan.split("-").map(Number);
  const monthStart = `${bulan}-01`;
  const monthEnd = `${bulan}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;

  const [monthSummary] = await db
    .select({
      jumlah: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${setoran.total}), 0)::double precision`,
      tunai: sql<number>`coalesce(sum(${setoran.tunai}), 0)::double precision`,
      nonTunai: sql<number>`coalesce(sum(${setoran.nonTunai}), 0)::double precision`,
      terverifikasi: sql<number>`count(*) filter (where ${setoran.status} = 'terverifikasi')::int`,
      menunggu: sql<number>`count(*) filter (where ${setoran.status} = 'menunggu')::int`,
      selisih: sql<number>`count(*) filter (where ${setoran.status} = 'selisih')::int`,
      verifiedTotal: sql<number>`coalesce(sum(${setoran.total}) filter (where ${setoran.status} = 'terverifikasi'), 0)::double precision`,
      pendingTotal: sql<number>`coalesce(sum(${setoran.total}) filter (where ${setoran.status} = 'menunggu'), 0)::double precision`,
      kaUnik: sql<number>`count(distinct ${setoran.unitId})::int`,
    })
    .from(setoran)
    .where(and(gte(setoran.tanggalDinas, monthStart), lte(setoran.tanggalDinas, monthEnd)));

  const prevStart = `${y}-${String(m - 1 || 12).padStart(2, "0")}-01`;
  const prevBulan = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const [prevY, prevM] = prevBulan.split("-").map(Number);
  const prevEnd = `${prevBulan}-${String(new Date(Date.UTC(prevY, prevM, 0)).getUTCDate()).padStart(2, "0")}`;
  const [prevSummary] = await db
    .select({ total: sql<number>`coalesce(sum(${setoran.total}), 0)::double precision` })
    .from(setoran)
    .where(and(gte(setoran.tanggalDinas, prevStart), lte(setoran.tanggalDinas, prevEnd)));

  const [trainCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      aktif: sql<number>`count(*) filter (where ${unitSetoran.statusAktif})::int`,
    })
    .from(unitSetoran);

  const dailySeries = await db
    .select({
      tanggal: setoran.tanggalDinas,
      total: sql<number>`coalesce(sum(${setoran.total}), 0)::double precision`,
      terverifikasi: sql<number>`count(*) filter (where ${setoran.status} = 'terverifikasi')::int`,
    })
    .from(setoran)
    .where(and(gte(setoran.tanggalDinas, monthStart), lte(setoran.tanggalDinas, monthEnd)))
    .groupBy(setoran.tanggalDinas)
    .orderBy(asc(setoran.tanggalDinas));

  const todayRows = await db
    .select({
      jumlah: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${setoran.total}), 0)::double precision`,
      terverifikasi: sql<number>`count(*) filter (where ${setoran.status} = 'terverifikasi')::int`,
      menunggu: sql<number>`count(*) filter (where ${setoran.status} = 'menunggu')::int`,
      selisih: sql<number>`count(*) filter (where ${setoran.status} = 'selisih')::int`,
    })
    .from(setoran)
    .where(eq(setoran.tanggalDinas, today));

  const topTrains = await db
    .select({
      id: unitSetoran.id,
      namaUnit: unitSetoran.namaUnit,
      nomorUnit: unitSetoran.nomorUnit,
      layanan: unitSetoran.layanan,
      total: sql<number>`coalesce(sum(${setoran.total}), 0)::double precision`,
      jumlah: sql<number>`count(*)::int`,
    })
    .from(setoran)
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .where(and(gte(setoran.tanggalDinas, monthStart), lte(setoran.tanggalDinas, monthEnd)))
    .groupBy(unitSetoran.id, unitSetoran.namaUnit, unitSetoran.nomorUnit, unitSetoran.layanan)
    .orderBy(desc(sql`sum(${setoran.total})`))
    .limit(5);

  const recent = (await db
    .select(depositSelection)
    .from(setoran)
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .orderBy(desc(setoran.createdAt))
    .limit(6)) as DepositRow[];

  const pendingQueue = (await db
    .select(depositSelection)
    .from(setoran)
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .where(eq(setoran.status, "menunggu"))
    .orderBy(desc(setoran.tanggalDinas), desc(setoran.total))
    .limit(5)) as DepositRow[];

  const kategoriSummary = await getKategoriSummary(monthStart, monthEnd);

  const todayKategori = await db
    .select({
      kategori: unitSetoran.kategori,
      unitAktif: sql<number>`count(distinct ${unitSetoran.id})::int`,
      sudah: sql<number>`count(distinct ${setoran.unitId})::int`,
      total: sql<number>`coalesce(sum(${setoran.total}), 0)::double precision`,
      menunggu: sql<number>`count(*) filter (where ${setoran.status} = 'menunggu')::int`,
    })
    .from(unitSetoran)
    .leftJoin(setoran, and(eq(setoran.unitId, unitSetoran.id), eq(setoran.tanggalDinas, today)))
    .where(eq(unitSetoran.statusAktif, true))
    .groupBy(unitSetoran.kategori);

  const belumSetor = await db
    .select({
      id: unitSetoran.id,
      namaUnit: unitSetoran.namaUnit,
      nomorUnit: unitSetoran.nomorUnit,
      relasi: unitSetoran.relasi,
    })
    .from(unitSetoran)
    .where(
      and(
        eq(unitSetoran.statusAktif, true),
        sql`not exists (select 1 from ${setoran} where ${setoran.unitId} = ${unitSetoran.id} and ${setoran.tanggalDinas} = ${today}::date)`,
      ),
    )
    .orderBy(asc(unitSetoran.id))
    .limit(6);

  return {
    today,
    bulan,
    monthSummary,
    prevTotal: Number(prevSummary?.total ?? 0),
    trainCounts,
    dailySeries,
    todayRow: todayRows[0] ?? { jumlah: 0, total: 0, terverifikasi: 0, menunggu: 0, selisih: 0 },
    kategoriSummary,
    todayKategori,
    activity: await getActivityFeed(7),
    topTrains,
    recent,
    pendingQueue,
    belumSetor,
  };
}

export async function getVerifiedDeposits(params: {
  dari?: string;
  sampai?: string;
  unitId?: number;
  kategori?: string;
  limit?: number;
}) {
  await ensureSeeded();
  const conditions = [eq(setoran.status, "terverifikasi")];
  if (params.dari) conditions.push(gte(setoran.tanggalDinas, params.dari));
  if (params.sampai) conditions.push(lte(setoran.tanggalDinas, params.sampai));
  if (params.unitId) conditions.push(eq(setoran.unitId, params.unitId));
  if (params.kategori && params.kategori !== "semua") conditions.push(eq(unitSetoran.kategori, params.kategori));

  return db
    .select(depositSelection)
    .from(setoran)
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .where(and(...conditions))
    .orderBy(desc(setoran.tanggalDinas), asc(unitSetoran.nomorUnit))
    .limit(params.limit ?? 300) as Promise<DepositRow[]>;
}

export async function getVerifiedByIds(ids: number[]) {
  if (ids.length === 0) return [] as DepositRow[];
  return db
    .select(depositSelection)
    .from(setoran)
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .where(and(inArray(setoran.id, ids), eq(setoran.status, "terverifikasi")))
    .orderBy(asc(setoran.tanggalDinas), asc(sql`length(${unitSetoran.nomorUnit})`), asc(unitSetoran.nomorUnit)) as Promise<
    DepositRow[]
  >;
}

export async function getSlipHistory(limit = 8) {
  await ensureSeeded();
  return db
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
    .limit(limit);
}

export async function getSlipByToken(token: string) {
  const rows = await db.select().from(slipSetoran).where(eq(slipSetoran.token, token)).limit(1);
  return rows[0] ?? null;
}

export async function getStatusRecap() {
  await ensureSeeded();
  return db
    .select({ status: setoran.status, jumlah: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${setoran.total}),0)::double precision` })
    .from(setoran)
    .groupBy(setoran.status);
}


export type ActivityItem = {
  id: string;
  jenis: "input" | "verifikasi" | "revisi";
  waktu: string;
  aktor: string;
  namaUnit: string;
  kategori: string;
  nomorUnit: string;
  total: number;
  catatan: string | null;
};

/** Feed aktivitas: input terbaru + keputusan verifikasi terbaru. */
export async function getActivityFeed(limit = 12): Promise<ActivityItem[]> {
  await ensureSeeded();
  const [inputs, decisions] = await Promise.all([
    db
      .select({
        id: setoran.id,
        waktu: setoran.createdAt,
        aktor: setoran.dibuatOleh,
        namaUnit: unitSetoran.namaUnit,
        kategori: unitSetoran.kategori,
        nomorUnit: unitSetoran.nomorUnit,
        total: setoran.total,
        status: setoran.status,
      })
      .from(setoran)
      .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
      .orderBy(desc(setoran.createdAt))
      .limit(limit),
    db
      .select({
        id: setoran.id,
        waktu: setoran.verifiedAt,
        aktor: setoran.verifikator,
        namaUnit: unitSetoran.namaUnit,
        kategori: unitSetoran.kategori,
        nomorUnit: unitSetoran.nomorUnit,
        total: setoran.total,
        status: setoran.status,
        catatan: setoran.catatanVerifikator,
      })
      .from(setoran)
      .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
      .where(sql`${setoran.verifiedAt} is not null`)
      .orderBy(desc(setoran.verifiedAt))
      .limit(limit),
  ]);

  const items: ActivityItem[] = [
    ...inputs.map((row) => ({
      id: `in-${row.id}`,
      jenis: "input" as const,
      waktu: new Date(row.waktu).toISOString(),
      aktor: row.aktor,
      namaUnit: row.namaUnit,
      kategori: row.kategori,
      nomorUnit: row.nomorUnit,
      total: Number(row.total),
      catatan: null,
    })),
    ...decisions.map((row) => ({
      id: `vr-${row.id}`,
      jenis: row.status === "selisih" ? ("revisi" as const) : ("verifikasi" as const),
      waktu: new Date(row.waktu as Date).toISOString(),
      aktor: row.aktor ?? "Kasir",
      namaUnit: row.namaUnit,
      kategori: row.kategori,
      nomorUnit: row.nomorUnit,
      total: Number(row.total),
      catatan: row.catatan,
    })),
  ];

  return items
    .sort((a, b) => (a.waktu < b.waktu ? 1 : -1))
    .slice(0, limit);
}

export async function getAuditLog(limit = 25) {
  await ensureSeeded();
  return db
    .select({
      id: riwayatVerifikasi.id,
      aksi: riwayatVerifikasi.aksi,
      statusSebelum: riwayatVerifikasi.statusSebelum,
      statusSesudah: riwayatVerifikasi.statusSesudah,
      aktor: riwayatVerifikasi.aktor,
      catatan: riwayatVerifikasi.catatan,
      createdAt: riwayatVerifikasi.createdAt,
      kodeSetoran: setoran.kodeSetoran,
      namaUnit: unitSetoran.namaUnit,
      kategori: unitSetoran.kategori,
    })
    .from(riwayatVerifikasi)
    .innerJoin(setoran, eq(riwayatVerifikasi.setoranId, setoran.id))
    .innerJoin(unitSetoran, eq(setoran.unitId, unitSetoran.id))
    .orderBy(desc(riwayatVerifikasi.createdAt))
    .limit(limit);
}

export async function countPending() {
  const [row] = await db.select({ jumlah: count() }).from(setoran).where(eq(setoran.status, "menunggu"));
  return Number(row?.jumlah ?? 0);
}

export function isStatus(value: string): value is StatusSetoran {
  return value === "menunggu" || value === "terverifikasi" || value === "selisih";
}
