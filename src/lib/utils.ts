export type StatusSetoran = "menunggu" | "terverifikasi" | "selisih";

export const STATUS_META: Record<
  StatusSetoran,
  { label: string; short: string; tone: string; dot: string; badge: string }
> = {
  menunggu: {
    label: "Menunggu Verifikasi",
    short: "Menunggu",
    tone: "amber",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  terverifikasi: {
    label: "Terverifikasi",
    short: "Terverifikasi",
    tone: "emerald",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  selisih: {
    label: "Revisi / Selisih",
    short: "Selisih",
    tone: "rose",
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

export function statusMeta(status: string) {
  return STATUS_META[(status as StatusSetoran) in STATUS_META ? (status as StatusSetoran) : "menunggu"];
}

export const SHIFT_OPTIONS = ["Pagi", "Siang", "Malam"] as const;

export const KELAS_OPTIONS = [
  // Kereta Api
  "Eksekutif",
  "Luxury",
  "Eksekutif–Bisnis",
  "Eksekutif–Ekonomi",
  "Bisnis",
  "Ekonomi",
  "Panoramic",
  // Non-KA
  "Jasa Parkir",
  "Parkir Harian",
  "Parkir Bulanan",
  "Cafe & Resto",
  "Retail / Booth",
  "Tenant",
  "Umum",
] as const;

/** Pilihan layanan default per kategori unit. */
export const LAYANAN_PER_KATEGORI: Record<UnitKategori, string[]> = {
  ka: ["Eksekutif", "Luxury", "Eksekutif–Bisnis", "Eksekutif–Ekonomi", "Bisnis", "Ekonomi", "Panoramic"],
  parkir: ["Jasa Parkir", "Parkir Harian", "Parkir Bulanan", "Umum"],
  cafe: ["Cafe & Resto", "Umum"],
  booth: ["Retail / Booth", "Tenant", "Umum"],
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function rupiah(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : value ?? 0;
  return rupiahFormatter.format(Number.isFinite(numeric as number) ? (numeric as number) : 0);
}

export function rupiahShort(value: number) {
  const n = Number(value) || 0;
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n}`;
}

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

/** Format ISO date (YYYY-MM-DD) menjadi "12 Juni 2026" */
export function formatTanggal(value: string | Date | null | undefined, withDay = false) {
  if (!value) return "—";
  const date = toDate(value);
  const label = `${date.getUTCDate()} ${BULAN[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  return withDay ? `${HARI[date.getUTCDay()]}, ${label}` : label;
}

export function formatTanggalPendek(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = toDate(value);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

export function formatWaktu(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  return `${formatter.format(date)} WIB`;
}

export function formatJam(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export function currentMonthISO() {
  return todayISO().slice(0, 7);
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${BULAN[(m ?? 1) - 1]} ${y}`;
}

export function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function firstDayOfMonth(month: string) {
  return `${month}-01`;
}

export function lastDayOfMonth(month: string) {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

const SATUAN = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

function terbilangInt(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilangInt(n - 10)} Belas`;
  if (n < 100) return `${terbilangInt(Math.floor(n / 10))} Puluh ${terbilangInt(n % 10)}`.trim();
  if (n < 200) return `Seratus ${terbilangInt(n - 100)}`.trim();
  if (n < 1000) return `${terbilangInt(Math.floor(n / 100))} Ratus ${terbilangInt(n % 100)}`.trim();
  if (n < 2000) return `Seribu ${terbilangInt(n - 1000)}`.trim();
  if (n < 1_000_000) return `${terbilangInt(Math.floor(n / 1000))} Ribu ${terbilangInt(n % 1000)}`.trim();
  if (n < 1_000_000_000) return `${terbilangInt(Math.floor(n / 1_000_000))} Juta ${terbilangInt(n % 1_000_000)}`.trim();
  if (n < 1_000_000_000_000)
    return `${terbilangInt(Math.floor(n / 1_000_000_000))} Miliar ${terbilangInt(n % 1_000_000_000)}`.trim();
  return `${terbilangInt(Math.floor(n / 1_000_000_000_000))} Triliun ${terbilangInt(n % 1_000_000_000_000)}`.trim();
}

/** Ubah angka menjadi kalimat terbilang rupiah, contoh: "Dua Belas Juta Rupiah" */
export function terbilangRupiah(value: number) {
  const n = Math.max(0, Math.round(Number(value) || 0));
  if (n === 0) return "Nol Rupiah";
  return `${terbilangInt(n).replace(/\s+/g, " ").trim()} Rupiah`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function parseNominal(input: string) {
  const digits = String(input ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

/* ================= KATEGORI UNIT SETORAN ================= */
export type UnitKategori = "ka" | "parkir" | "cafe" | "booth";

export const KATEGORI_ORDER: UnitKategori[] = ["ka", "parkir", "cafe", "booth"];

export const KATEGORI_META: Record<
  UnitKategori,
  { label: string; singkat: string; badge: string; solid: string; ring: string; icon: string; deskripsi: string }
> = {
  ka: {
    label: "Kereta Api",
    singkat: "KA",
    badge: "bg-ink-50 text-ink-700 ring-ink-200",
    solid: "bg-ink-800 text-white",
    ring: "ring-ink-200",
    icon: "🚆",
    deskripsi: "Setoran on-board / kondektur 63 KA",
  },
  parkir: {
    label: "Parkir",
    singkat: "Parkir",
    badge: "bg-sky-50 text-sky-700 ring-sky-200",
    solid: "bg-sky-600 text-white",
    ring: "ring-sky-200",
    icon: "🅿️",
    deskripsi: "13 titik parkir stasiun",
  },
  cafe: {
    label: "Loko Cafe",
    singkat: "Cafe",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    solid: "bg-amber-500 text-ink-950",
    ring: "ring-amber-200",
    icon: "☕",
    deskripsi: "Loko Cafe Tawang & Poncol",
  },
  booth: {
    label: "Booth Loko",
    singkat: "Booth",
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
    solid: "bg-violet-600 text-white",
    ring: "ring-violet-200",
    icon: "🛍️",
    deskripsi: "Booth retail Loko",
  },
};

export function kategoriMeta(kategori: string | null | undefined) {
  return KATEGORI_META[(kategori ?? "ka") as UnitKategori] ?? KATEGORI_META.ka;
}

type UnitLike = { kategori?: string | null; namaUnit: string; nomorUnit: string };

/** Label tampil: "KA 1 · Argo Bromo Anggrek" / "Parkir Stasiun Tawang" / "Loko Cafe Tawang". */
export function unitDisplay(unit: UnitLike, withNomor = true) {
  if ((unit.kategori ?? "ka") === "ka") {
    return withNomor ? `KA ${unit.nomorUnit} · ${unit.namaUnit}` : unit.namaUnit;
  }
  return unit.namaUnit;
}

/** Label ringkas untuk kolom tabel. */
export function unitShort(unit: UnitLike) {
  return (unit.kategori ?? "ka") === "ka" ? `KA ${unit.nomorUnit}` : unit.nomorUnit;
}
