/**
 * MODUL 1 — Seed master unit setoran.
 * 63 Kereta Api + 13 titik Parkir + 2 Loko Cafe + 1 Booth Loko = 79 unit.
 */
type TrainSeedTuple = [string, string, string, string];

const TRAIN_TABLE: TrainSeedTuple[] = [
  ["1", "Argo Bromo Anggrek", "Eksekutif", "Gambir – Surabaya Pasarturi"],
  ["2", "Argo Bromo Anggrek", "Eksekutif", "Surabaya Pasarturi – Gambir"],
  ["3", "Argo Bromo Anggrek", "Luxury", "Gambir – Surabaya Pasarturi"],
  ["4", "Argo Bromo Anggrek", "Luxury", "Surabaya Pasarturi – Gambir"],
  ["5", "Argo Wilis", "Eksekutif", "Bandung – Surabaya Gubeng"],
  ["6", "Argo Wilis", "Eksekutif", "Surabaya Gubeng – Bandung"],
  ["7", "Argo Lawu", "Eksekutif", "Gambir – Solo Balapan"],
  ["8", "Argo Lawu", "Eksekutif", "Solo Balapan – Gambir"],
  ["9", "Argo Dwipangga", "Eksekutif", "Gambir – Solo Balapan"],
  ["10", "Argo Dwipangga", "Eksekutif", "Solo Balapan – Gambir"],
  ["11", "Argo Muria", "Eksekutif", "Gambir – Semarang Tawang"],
  ["12", "Argo Muria", "Eksekutif", "Semarang Tawang – Gambir"],
  ["13", "Argo Sindoro", "Eksekutif", "Gambir – Semarang Tawang"],
  ["14", "Argo Sindoro", "Eksekutif", "Semarang Tawang – Gambir"],
  ["15", "Argo Jati", "Eksekutif", "Gambir – Cirebon"],
  ["16", "Argo Jati", "Eksekutif", "Cirebon – Gambir"],
  ["17", "Argo Parahyangan", "Eksekutif–Ekonomi", "Gambir – Bandung"],
  ["18", "Argo Parahyangan", "Eksekutif–Ekonomi", "Bandung – Gambir"],
  ["19", "Argo Cheribon", "Eksekutif–Ekonomi", "Gambir – Cirebon"],
  ["20", "Argo Cheribon", "Eksekutif–Ekonomi", "Cirebon – Gambir"],
  ["21", "Gajayana", "Eksekutif", "Gambir – Malang"],
  ["22", "Gajayana", "Eksekutif", "Malang – Gambir"],
  ["23", "Gajayana", "Luxury", "Gambir – Malang"],
  ["24", "Bima", "Eksekutif", "Gambir – Surabaya Gubeng"],
  ["25", "Bima", "Eksekutif", "Surabaya Gubeng – Gambir"],
  ["26", "Turangga", "Eksekutif", "Bandung – Surabaya Gubeng"],
  ["27", "Turangga", "Eksekutif", "Surabaya Gubeng – Bandung"],
  ["28", "Mutiara Selatan", "Eksekutif–Bisnis", "Bandung – Surabaya Pasarturi"],
  ["29", "Mutiara Selatan", "Eksekutif–Bisnis", "Surabaya Pasarturi – Bandung"],
  ["30", "Mutiara Timur", "Eksekutif–Bisnis", "Surabaya Gubeng – Banyuwangi"],
  ["31", "Mutiara Timur", "Eksekutif–Bisnis", "Banyuwangi – Surabaya Gubeng"],
  ["32", "Ranggajati", "Eksekutif–Bisnis", "Cirebon – Jember"],
  ["33", "Ranggajati", "Eksekutif–Bisnis", "Jember – Cirebon"],
  ["34", "Sancaka", "Eksekutif–Ekonomi", "Surabaya Gubeng – Yogyakarta"],
  ["35", "Sancaka", "Eksekutif–Ekonomi", "Yogyakarta – Surabaya Gubeng"],
  ["36", "Sancaka Utara", "Eksekutif–Ekonomi", "Surabaya Pasarturi – Yogyakarta"],
  ["37", "Sancaka Utara", "Eksekutif–Ekonomi", "Yogyakarta – Surabaya Pasarturi"],
  ["38", "Malioboro Ekspres", "Eksekutif–Ekonomi", "Yogyakarta – Malang"],
  ["39", "Malioboro Ekspres", "Eksekutif–Ekonomi", "Malang – Yogyakarta"],
  ["40", "Taksaka", "Eksekutif", "Gambir – Yogyakarta"],
  ["41", "Taksaka", "Eksekutif", "Yogyakarta – Gambir"],
  ["42", "Taksaka", "Luxury", "Gambir – Yogyakarta"],
  ["43", "Purwojaya", "Eksekutif", "Gambir – Cilacap"],
  ["44", "Purwojaya", "Eksekutif", "Cilacap – Gambir"],
  ["45", "Kertajaya", "Ekonomi", "Pasarsenen – Surabaya Pasarturi"],
  ["46", "Kertajaya", "Ekonomi", "Surabaya Pasarturi – Pasarsenen"],
  ["47", "Jayakarta", "Ekonomi", "Pasarsenen – Surabaya Gubeng"],
  ["48", "Jayakarta", "Ekonomi", "Surabaya Gubeng – Pasarsenen"],
  ["49", "Matarmaja", "Ekonomi", "Pasarsenen – Malang"],
  ["50", "Matarmaja", "Ekonomi", "Malang – Pasarsenen"],
  ["51", "Kahuripan", "Ekonomi", "Kiaracondong – Blitar"],
  ["52", "Kahuripan", "Ekonomi", "Blitar – Kiaracondong"],
  ["53", "Pasundan", "Ekonomi", "Kiaracondong – Surabaya Gubeng"],
  ["54", "Pasundan", "Ekonomi", "Surabaya Gubeng – Kiaracondong"],
  ["55", "Sri Tanjung", "Ekonomi", "Lempuyangan – Banyuwangi"],
  ["56", "Sri Tanjung", "Ekonomi", "Banyuwangi – Lempuyangan"],
  ["57", "Serayu", "Ekonomi", "Pasarsenen – Kroya"],
  ["58", "Serayu", "Ekonomi", "Kroya – Pasarsenen"],
  ["59", "Bengawan", "Ekonomi", "Pasarsenen – Purwosari"],
  ["60", "Bengawan", "Ekonomi", "Purwosari – Pasarsenen"],
  ["61", "Progo", "Ekonomi", "Pasarsenen – Lempuyangan"],
  ["62", "Progo", "Ekonomi", "Lempuyangan – Pasarsenen"],
  ["63", "Airlangga", "Ekonomi", "Pasarsenen – Surabaya Pasarturi"],
];

function makeKode(nama: string, nomor: string) {
  const initials = nama
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase())
    .join("")
    .slice(0, 3);
  return `${initials || "KA"}-${nomor.padStart(3, "0")}`;
}

export const TRAIN_SEED = TRAIN_TABLE.map(([nomor, nama, kelas, relasi]) => ({
  kodeUnit: makeKode(nama, nomor),
  namaUnit: nama,
  nomorUnit: nomor,
  kategori: "ka",
  layanan: kelas,
  relasi,
  statusAktif: true,
}));

/** 13 titik parkir milik divisi Parkir. */
const PARKIR_TABLE: Array<[string, string, string]> = [
  ["P01", "Parkir Stasiun Tawang", "Area depan Stasiun Tawang"],
  ["P02", "Parkir Stasiun Poncol", "Area depan Stasiun Poncol"],
  ["P03", "Parkir Utara Tawang", "Sisi utara jalur rel Stasiun Tawang"],
  ["P04", "Parkir Selatan Tawang", "Sisi selatan Stasiun Tawang"],
  ["P05", "Parkir Timur Poncol", "Sisi timur Stasiun Poncol"],
  ["P06", "Parkir Barat Poncol", "Sisi barat Stasiun Poncol"],
  ["P07", "Parkir Motor Tawang", "Zona roda dua Tawang"],
  ["P08", "Parkir Motor Poncol", "Zona roda dua Poncol"],
  ["P09", "Parkir Mobil Tawang", "Zona roda empat Tawang"],
  ["P10", "Parkir Mobil Poncol", "Zona roda empat Poncol"],
  ["P11", "Parkir VIP Tawang", "Zona VIP & drop off Tawang"],
  ["P12", "Parkir Karyawan", "Area parkir pegawai DAOP 4"],
  ["P13", "Parkir Gudang & Kargo", "Area gudang/kargo Stasiun Tawang"],
];

export const PARKIR_SEED = PARKIR_TABLE.map(([nomor, nama, relasi]) => ({
  kodeUnit: `PRK-${nomor}`,
  namaUnit: nama,
  nomorUnit: nomor,
  kategori: "parkir",
  layanan: "Jasa Parkir",
  relasi,
  statusAktif: true,
}));

/** Loko Cafe & Booth Loko (unit usaha F&B / retail). */
export const USAHA_SEED = [
  {
    kodeUnit: "CFE-TWG",
    namaUnit: "Loko Cafe Tawang",
    nomorUnit: "CF01",
    kategori: "cafe",
    layanan: "Cafe & Resto",
    relasi: "Stasiun Tawang, Semarang",
    statusAktif: true,
  },
  {
    kodeUnit: "CFE-PCL",
    namaUnit: "Loko Cafe Poncol",
    nomorUnit: "CF02",
    kategori: "cafe",
    layanan: "Cafe & Resto",
    relasi: "Stasiun Poncol, Semarang",
    statusAktif: true,
  },
  {
    kodeUnit: "BTH-LKO",
    namaUnit: "Booth Loko",
    nomorUnit: "BH01",
    kategori: "booth",
    layanan: "Retail / Booth",
    relasi: "Area peron Stasiun Tawang",
    statusAktif: true,
  },
];

export const UNIT_SEED = [...TRAIN_SEED, ...PARKIR_SEED, ...USAHA_SEED];

export const PETUGAS_SEED = [
  "Bagus Nugroho",
  "Siti Rahmawati",
  "Andi Pratama",
  "Dewi Lestari",
  "Rizky Hidayat",
  "Yuni Kartika",
  "Fajar Setiawan",
  "Nur Aisyah",
];

export const PETUGAS_NON_KA = ["Slamet Riyadi", "Teguh Prasetyo", "Maya Anggraini", "Hendra Wijaya"];
