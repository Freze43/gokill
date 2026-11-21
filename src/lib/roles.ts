/**
 * DEFINISI 4 PERAN & HAK AKSES — SIVERA
 * Modul dipisahkan dari context klien agar bisa dipakai server & klien.
 */
export type ActorRole = "admin" | "sales" | "crew" | "kasir";

export const ROLE_ORDER: ActorRole[] = ["admin", "sales", "crew", "kasir"];

export const ROLE_META: Record<
  ActorRole,
  { label: string; deskripsi: string; inisial: string; namaContoh: string; tone: string; tanggungJawab: string }
> = {
  admin: {
    label: "Admin",
    deskripsi: "Master KA, pengguna & pengaturan",
    inisial: "AD",
    namaContoh: "Admin SIVERA",
    tone: "bg-ink-800",
    tanggungJawab: "Mengelola 63 master KA, kop unit, penandatangan, serta hak akses peran.",
  },
  sales: {
    label: "Sales",
    deskripsi: "Input setoran & pantau pendapatan",
    inisial: "SL",
    namaContoh: "Andi Pratama",
    tone: "bg-sky-600",
    tanggungJawab: "Menginput setoran penjualan tiket/on-board dari desktop dan memantau statusnya.",
  },
  crew: {
    label: "Crew",
    deskripsi: "Input setoran lewat HP di atas KA",
    inisial: "CR",
    namaContoh: "Bagus Nugroho",
    tone: "bg-brand-500",
    tanggungJawab: "Menyetor pendapatan kereta melalui mode HP: pilih KA, isi nominal, foto bukti, kirim.",
  },
  kasir: {
    label: "Kasir",
    deskripsi: "Verifikasi setoran & cetak slip",
    inisial: "KS",
    namaContoh: "Rani Puspita",
    tone: "bg-emerald-600",
    tanggungJawab: "Memverifikasi setoran Sales/Crew, mencatat selisih, dan menerbitkan slip resmi.",
  },
};

export type Permission =
  | "dashboard"
  | "input"
  | "input_mobile"
  | "data"
  | "kalender"
  | "verify"
  | "slip"
  | "master"
  | "settings";

export const ROLE_PERMISSIONS: Record<ActorRole, Permission[]> = {
  admin: ["dashboard", "data", "kalender", "master", "settings"],
  sales: ["dashboard", "input", "input_mobile", "data", "kalender"],
  crew: ["dashboard", "input", "input_mobile", "data", "kalender"],
  kasir: ["dashboard", "data", "kalender", "verify", "slip"],
};

export function roleCan(role: ActorRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const PERMISSION_ROWS: Array<{ key: Permission; label: string; desc: string }> = [
  { key: "dashboard", label: "Dashboard pendapatan", desc: "KPI, tren, antrean ringkas" },
  { key: "input", label: "Input setoran (desktop)", desc: "Form lengkap + unggah bukti" },
  { key: "input_mobile", label: "Input setoran via HP", desc: "Mode Crew: kamera & tombol besar" },
  { key: "data", label: "Data setoran & kalender", desc: "Pantau seluruh transaksi 63 KA" },
  { key: "verify", label: "Verifikasi setoran", desc: "Setujui, revisi selisih, massal" },
  { key: "slip", label: "Slip & rekapitulasi", desc: "Slip resmi + QR validasi" },
  { key: "master", label: "Master data 63 KA", desc: "Tambah/edit/nonaktifkan KA" },
  { key: "settings", label: "Pengaturan & peran", desc: "Kop unit, penandatangan, RBAC" },
];
