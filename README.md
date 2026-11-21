# SIVERA — Sistem Setoran & Verifikasi Pendapatan Kereta Api

Aplikasi pencatatan, pemantauan, dan verifikasi setoran pendapatan **79 unit** — 63 Kereta Api, 13 titik Parkir, 2 Loko Cafe (Tawang & Poncol), dan Booth Loko — dengan 4 modul terintegrasi:

1. **Master Unit Setoran (Admin)** — 63 KA + 13 Parkir + 2 Loko Cafe + Booth Loko. Admin dapat menambah unit satu per satu maupun **massal** (tempel daftar KA terbaru), mengedit beberapa nama/kode/lokasi/layanan sekaligus lalu menyimpan, menonaktifkan, atau menghapus unit tanpa riwayat.
2. **Input Setoran + Kalender Pendapatan** — form setoran tunai/non-tunai dengan unggah bukti resi, total otomatis, dan kalender bulanan interaktif (rasio `x/63 KA`, total nominal, indikator warna hijau/kuning/merah + modal rincian harian).
3. **Verifikasi Setoran** — antrean verifikator, filter tanggal/KA/status, perbandingan nominal dengan bukti, setujui (nama + timestamp), revisi selisih (kurang/lebih + catatan), dan **verifikasi massal**.
4. **Slip Setoran Resmi** — rekap harian, per KA, atau gabungan dari data **terverifikasi** saja; nomor referensi otomatis `SLP/KA/YYYYMMDD/001`, terbilang Bahasa Indonesia, 3 kolom tanda tangan, QR + token validasi publik, siap cetak A4/PDF.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL + Drizzle ORM · `qrcode`.

---

## 4 Peran (RBAC)

| Peran | Kewenangan | Halaman utama |
| --- | --- | --- |
| **Admin** | Master 79 unit (tambah daftar KA terbaru, edit nama KA/parkir/cafe/booth, bulk import), pengaturan unit, matriks peran | `/master-unit`, `/pengaturan` |
| **Sales** | Input setoran (desktop) & pantau pendapatan | `/setoran/baru`, `/setoran`, `/kalender` |
| **Crew** | Input setoran **via HP** (kamera, tombol besar) | `/mobile`, `/setoran` |
| **Kasir** | **Verifikasi** setoran, revisi selisih, verifikasi massal, **terbitkan slip** | `/verifikasi`, `/slip` |

Matriks hak akses didefinisikan di [`src/lib/roles.ts`](src/lib/roles.ts) (`ROLE_META`, `ROLE_PERMISSIONS`, `PERMISSION_ROWS`) dan ditegakkan di UI melalui `RoleGate` serta `DepositTable` (checkbox verifikasi hanya untuk Kasir/Admin). Peran aktif dapat diganti dari pemilih di sidebar (mode demo, disimpan di `localStorage`).

> Peran diambil dari sesi login (bukan lagi localStorage). Pembatasan ditegakkan di server: middleware untuk halaman & `requireRole` untuk API.

---


## Penyempurnaan terbaru

- **Ekspor CSV** data setoran mengikuti filter aktif (`/api/setoran/export`) — siap dibuka di Excel (UTF-8 BOM, koma sebagai pemisah, baris total).
- **Jejak audit** khusus Admin (`/audit`): setiap input, persetujuan, verifikasi massal, dan revisi selisih beserta aktor, status sebelum→sesudah, dan catatan.
- **Penyelesaian selisih**: Kasir dapat menutup setoran berstatus *selisih* menjadi *terverifikasi* setelah petugas memperbaiki (tercatat sebagai `selesaikan_selisih`).
- **Preset periode** pada Data Setoran (Hari ini / 7 hari / 30 hari / Bulan ini) di samping filter tanggal manual.
- **Kelengkapan setoran hari ini** per kategori di dashboard (unit sudah setor / unit aktif + nilai & jumlah menunggu), plus feed aktivitas ringkas.
- **Loading skeleton** global untuk transisi halaman yang lebih halus.


## Autentikasi & RBAC (server-side)

- **Login**: `/login` — email + kata sandi, sesi disimpan pada cookie `HttpOnly` bertanda tangan HMAC-SHA256 (12 jam) dan diverifikasi di `middleware.ts` (Web Crypto) serta di setiap endpoint API (`requireRole`).
- **Akun demo** (password `sivera123`, otomatis di-seed): `admin@sivera.id`, `sales@sivera.id`, `crew@sivera.id`, `kasir@sivera.id`.
- **Hak akses API**:

  | Aksi | Peran |
  | --- | --- |
  | Master unit (tambah/edit/hapus) | Admin |
  | Input setoran (desktop & HP) | Sales, Crew, Admin |
  | Verifikasi & penyelesaian selisih, verifikasi massal | Kasir, Admin |
  | Terbitkan slip | Kasir, Admin |
  | Pengaturan unit & kelola pengguna | Admin |
  | Baca data/kalender/laporan | Semua peran yang login |

- **Manajemen pengguna** (Admin) di `/pengaturan`: tambah akun, ubah peran, aktif/nonaktifkan, reset kata sandi (hash scrypt + salt).
- Variabel lingkungan: `AUTH_SECRET` (wajib diganti di produksi).

## Penyimpanan bukti setor

Foto resi dikompres di browser lalu diunggah ke `POST /api/bukti` dan disimpan sebagai berkas di `public/uploads/bukti/`, sehingga baris database hanya menyimpan URL pendek. Penyajian berkas melalui `GET /api/bukti/[file]` (validasi nama berkas + tipe MIME, maks 3,5 MB). Data seed tetap memakai bukti contoh `/api/bukti-demo`.

## Rancangan Struktur Database

```
master_ka (1) ──< setoran (N) ──< riwayat_verifikasi
                     │
                     └─(snapshot JSONB)─> slip_setoran     pengaturan (1) ─> kop slip
```

| Tabel | Fungsi | Kolom kunci |
| --- | --- | --- |
| `unit_setoran` | Master 79 unit (Modul 1) | `id` PK, `kode_unit` UNIQUE, `nama_unit`, `nomor_unit`, `kategori` (ka/parkir/cafe/booth), `relasi`, `layanan`, `status_aktif` |
| `setoran` | Transaksi setoran (Modul 2 & 3) | `id` PK, `kode_setoran` UNIQUE, `tanggal_dinas`, `unit_id` FK, `shift`, `petugas`, `tunai`, `non_tunai`, `total`, `bukti_*`, `status`, `jenis_selisih`, `nominal_selisih`, `verifikator`, `verified_at`; UNIQUE (`unit_id`,`tanggal_dinas`) |
| `riwayat_verifikasi` | Audit trail aksi verifikasi | `id` PK, `setoran_id` FK, `aksi`, `status_sebelum`, `status_sesudah`, `aktor`, `catatan` |
| `slip_setoran` | Slip yang diterbitkan (Modul 4) | `id` PK, `nomor_referensi` UNIQUE (prefix SLP/KA, SLP/PRK, SLP/CFE, SLP/BTH), `token` UNIQUE, `jenis`, `unit_id`, `kategori`, `grand_total`, `terbilang`, `snapshot` JSONB |
| `pengaturan` | Kop instansi & penandatangan | `nama_unit`, `alamat_unit`, `nama_kepala_unit`, `nama_verifikator` |
| `pengguna` | Akun login + peran | `id` PK, `email` UNIQUE, `nama`, `role`, `password_hash` (scrypt), `status_aktif`, `last_login_at` |

Status setoran: `menunggu` → `terverifikasi` atau `selisih` (revisi). Slip hanya menarik `terverifikasi`.

Definisi lengkap ada di [`src/db/schema.ts`](src/db/schema.ts) dan halaman in-app **Skema & Alur** (`/dokumentasi`).

---

## Menjalankan

```bash
npm install
npx drizzle-kit push     # buat tabel
npm run dev              # http://localhost:3000
```

Seed otomatis: 79 unit (63 KA, 13 parkir, 2 Loko Cafe, 1 Booth Loko), pengaturan unit, dan ±3.000 transaksi contoh dua bulan terakhir (untuk simulasi kalender & antrean). Seed bersifat idempoten dan dijalankan saat data masih kosong.

Variabel lingkungan: `DATABASE_URL` (lihat `.env`).

---

## API utama

| Method | Endpoint | Kegunaan |
| --- | --- | --- |
| GET/POST/PATCH/DELETE | `/api/units` | Master unit (KA/parkir/cafe/booth) & simpan massal — Admin |
| POST | `/api/auth/login` · `/api/auth/logout` | Sesi login/logout |
| GET/POST/PATCH | `/api/users` | Kelola akun & peran — Admin |
| POST | `/api/bukti` | Unggah foto bukti setor ke disk |
| GET/POST | `/api/setoran` | Daftar/filter & simpan setoran (status awal `menunggu`) |
| POST | `/api/setoran/:id/verifikasi` | Setujui / revisi selisih |
| POST | `/api/setoran/verifikasi-massal` | Bulk verify |
| GET | `/api/kalender?bulan=YYYY-MM` / `?tanggal=YYYY-MM-DD` | Agregat kalender & rincian harian |
| POST/GET | `/api/slip` | Terbitkan slip / riwayat slip |
| GET | `/api/qr?data=...` | QR validasi (PNG) |
| GET/PUT | `/api/pengaturan` | Kop instansi & penandatangan |
| GET | `/api/bukti-demo?...` | Bukti setor contoh (SVG) untuk data seed |

---

## Catatan adaptasi Google Apps Script (GAS)

Implementasi ini berjalan di runtime Next.js + PostgreSQL. Struktur data dirancang agar **mudah dipindahkan ke Google Sheets + Apps Script**:

| PostgreSQL | Google Sheets | GAS |
| --- | --- | --- |
| `unit_setoran` | Sheet `MasterUnit` | `getUnits()` / `simpanUnit()` |
| `setoran` | Sheet `Setoran` | `simpanSetoran()`, `verifikasiMassal()` |
| `riwayat_verifikasi` | Sheet `LogVerifikasi` | `appendRow()` pada setiap aksi |
| `slip_setoran` | Sheet `Slip` | `buatSlip()` + snapshot JSON |
| `pengaturan` | Sheet `Pengaturan` | key–value kop instansi |
| peran (RBAC) | Sheet `Pengguna` | `email → role (admin/sales/crew/kasir)` |
| Bukti setor | Drive folder / Base64 | `DriveApp.createFile()` → URL kolom bukti |
| QR | Chart API / `api.qrserver.com` | URL `/exec?page=validasi&token=...` |

`doGet(e)` merender halaman HTML via `HtmlService`, sedangkan tombol simpan/verifikasi memakai `google.script.run` ke fungsi server. Rumus total (`tunai + non_tunai`), validasi status, penomoran slip harian, dan terbilang dapat disalin langsung ke `Code.gs`.

> Mode peran (admin / verifikator / petugas / supervisor) pada aplikasi ini berupa simulasi tanpa autentikasi. Untuk produksi, pasang SSO/LDAP dan RBAC.

---

## Versi Google Apps Script (GAS)

Ya — aplikasi ini bisa dialihkan penuh ke Google Apps Script. Paket siap-deploy tersedia di [`public/gas/`](public/gas) dan dapat diunduh sebagai **`/download/sivera-gas.zip`**. Menu versi Apps Script sudah dihapus dari aplikasi — berkas tetap disimpan sebagai lampiran portabilitas.

| Berkas | Fungsi |
| --- | --- |
| `Code.gs` | Backend: `doGet`/`doPost`, `setupSpreadsheet_` (6 sheet), seed 79 unit, `simpanSetoran` (anti-duplikat + `LockService`), `verifikasiSetoran`, `verifikasiMassal`, `getKalender`, `buatSlip` (nomor `SLP/KA|PRK|CFE|BTH|ALL`, terbilang, snapshot), `simpanBuktiKeDrive_`, `reminderBelumSetor`, JSON API |
| `Index.html` / `Styles.html` / `JavaScript.html` | UI HtmlService: tab Dashboard, Input, Verifikasi, Kalender, Slip + CSS cetak A4 |
| `appsscript.json` | Manifest + scope Sheets/Drive/Gmail + konfigurasi web app |
| `README-GAS.md` | Langkah deploy 5 menit, struktur sheet, API, batasan GAS & penanganannya |

Pemetaan: PostgreSQL → Sheets, `/api/*` → fungsi global + `google.script.run`, upload bukti → `DriveApp`, QR → `quickchart.io`, cron → Triggers, RBAC → `Session.getActiveUser()` + sheet `Pengguna`.

