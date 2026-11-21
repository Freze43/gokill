import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * MODUL 1 — MASTER UNIT SETORAN
 * Satu tabel untuk semua sumber pendapatan:
 *  - ka     : 63 Kereta Api
 *  - parkir : 13 titik parkir
 *  - cafe   : Loko Cafe Tawang & Loko Cafe Poncol
 *  - booth  : Booth Loko
 */
export const unitSetoran = pgTable(
  "unit_setoran",
  {
    id: serial("id").primaryKey(),
    kodeUnit: varchar("kode_unit", { length: 24 }).notNull(),
    namaUnit: varchar("nama_unit", { length: 120 }).notNull(),
    nomorUnit: varchar("nomor_unit", { length: 16 }).notNull(),
    /** ka | parkir | cafe | booth */
    kategori: varchar("kategori", { length: 16 }).notNull().default("ka"),
    relasi: varchar("relasi", { length: 180 }).notNull().default(""),
    layanan: varchar("layanan", { length: 80 }).notNull(),
    statusAktif: boolean("status_aktif").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unit_setoran_kode_uniq").on(table.kodeUnit),
    index("unit_setoran_kategori_idx").on(table.kategori),
  ],
);

/**
 * MODUL 2 — SETORAN PENDAPATAN
 * Satu baris = satu unit pada satu tanggal dinas (berlaku untuk KA & non-KA).
 */
export const setoran = pgTable(
  "setoran",
  {
    id: serial("id").primaryKey(),
    kodeSetoran: varchar("kode_setoran", { length: 32 }).notNull(),
    tanggalDinas: date("tanggal_dinas").notNull(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => unitSetoran.id, { onDelete: "restrict" }),
    shift: varchar("shift", { length: 24 }).notNull().default("Pagi"),
    petugas: varchar("petugas", { length: 120 }).notNull(),
    tunai: bigint("tunai", { mode: "number" }).notNull().default(0),
    nonTunai: bigint("non_tunai", { mode: "number" }).notNull().default(0),
    total: bigint("total", { mode: "number" }).notNull().default(0),
    buktiNama: text("bukti_nama"),
    buktiTipe: varchar("bukti_tipe", { length: 40 }).notNull().default("demo"),
    buktiData: text("bukti_data"),
    /** menunggu | terverifikasi | selisih */
    status: varchar("status", { length: 24 }).notNull().default("menunggu"),
    /** kurang | lebih | null */
    jenisSelisih: varchar("jenis_selisih", { length: 16 }),
    nominalSelisih: bigint("nominal_selisih", { mode: "number" }).notNull().default(0),
    catatanVerifikator: text("catatan_verifikator"),
    catatanPetugas: text("catatan_petugas"),
    verifikator: varchar("verifikator", { length: 120 }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    dibuatOleh: varchar("dibuat_oleh", { length: 120 }).notNull().default("Petugas Loket"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("setoran_kode_uniq").on(table.kodeSetoran),
    uniqueIndex("setoran_unit_tanggal_uniq").on(table.unitId, table.tanggalDinas),
    index("setoran_tanggal_idx").on(table.tanggalDinas),
    index("setoran_status_idx").on(table.status),
  ],
);

/** Jejak audit aksi verifikasi. */
export const riwayatVerifikasi = pgTable("riwayat_verifikasi", {
  id: serial("id").primaryKey(),
  setoranId: integer("setoran_id")
    .notNull()
    .references(() => setoran.id, { onDelete: "cascade" }),
  aksi: varchar("aksi", { length: 40 }).notNull(),
  statusSebelum: varchar("status_sebelum", { length: 24 }).notNull(),
  statusSesudah: varchar("status_sesudah", { length: 24 }).notNull(),
  aktor: varchar("aktor", { length: 120 }).notNull(),
  catatan: text("catatan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** MODUL 4 — SLIP SETORAN TERVERIFIKASI (snapshot). */
export const slipSetoran = pgTable(
  "slip_setoran",
  {
    id: serial("id").primaryKey(),
    nomorReferensi: varchar("nomor_referensi", { length: 64 }).notNull(),
    token: varchar("token", { length: 40 }).notNull(),
    /** harian | per_unit | gabungan */
    jenis: varchar("jenis", { length: 24 }).notNull(),
    periodeMulai: date("periode_mulai").notNull(),
    periodeSelesai: date("periode_selesai").notNull(),
    unitId: integer("unit_id"),
    kategori: varchar("kategori", { length: 16 }),
    jumlahTransaksi: integer("jumlah_transaksi").notNull().default(0),
    grandTotal: bigint("grand_total", { mode: "number" }).notNull().default(0),
    terbilang: text("terbilang").notNull().default(""),
    dicetakOleh: varchar("dicetak_oleh", { length: 120 }).notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("slip_nomor_uniq").on(table.nomorReferensi),
    uniqueIndex("slip_token_uniq").on(table.token),
  ],
);

/** Pengguna aplikasi (autentikasi + RBAC). */
export const pengguna = pgTable(
  "pengguna",
  {
    id: serial("id").primaryKey(),
    nama: varchar("nama", { length: 120 }).notNull(),
    email: varchar("email", { length: 160 }).notNull(),
    /** admin | sales | crew | kasir */
    role: varchar("role", { length: 16 }).notNull().default("crew"),
    passwordHash: text("password_hash").notNull(),
    statusAktif: boolean("status_aktif").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("pengguna_email_uniq").on(table.email)],
);

/** Pengaturan unit kerja untuk kop slip & penandatangan. */
export const pengaturan = pgTable("pengaturan", {
  id: serial("id").primaryKey(),
  namaUnit: varchar("nama_unit", { length: 160 }).notNull(),
  alamatUnit: text("alamat_unit").notNull().default(""),
  namaKepalaUnit: varchar("nama_kepala_unit", { length: 120 }).notNull().default(""),
  namaVerifikator: varchar("nama_verifikator", { length: 120 }).notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UnitSetoran = typeof unitSetoran.$inferSelect;
export type Setoran = typeof setoran.$inferSelect;
export type SlipSetoran = typeof slipSetoran.$inferSelect;
export type Pengaturan = typeof pengaturan.$inferSelect;
export type Pengguna = typeof pengguna.$inferSelect;
