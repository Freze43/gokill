export type SlipRow = {
  id: number;
  tanggalDinas: string;
  nomorUnit: string;
  kodeUnit: string;
  namaUnit: string;
  kategori: string;
  layanan: string;
  relasi: string;
  shift: string;
  petugas: string;
  tunai: number;
  nonTunai: number;
  total: number;
  verifikator: string | null;
  verifiedAt: string | null;
};

export type SlipSnapshot = {
  unit: {
    namaUnit: string;
    alamatUnit: string;
    namaKepalaUnit: string;
    namaVerifikator: string;
  };
  rows: SlipRow[];
  totalTunai: number;
  totalNonTunai: number;
  grandTotal: number;
  terbilang: string;
  jumlah: number;
};

export type SlipRecord = {
  id: number;
  nomorReferensi: string;
  token: string;
  jenis: string;
  periodeMulai: string;
  periodeSelesai: string;
  kategori?: string | null;
  jumlahTransaksi: number;
  grandTotal: number;
  terbilang: string;
  dicetakOleh: string;
  createdAt: string;
  snapshot: SlipSnapshot;
};

export const SLIP_JENIS_LABEL: Record<string, string> = {
  harian: "Rekap Harian",
  per_unit: "Rekap per Unit / KA",
  per_ka: "Rekap per Unit / KA",
  gabungan: "Slip Gabungan (Seleksi)",
};

export function validationPath(token: string) {
  return `/validasi/${token}`;
}
