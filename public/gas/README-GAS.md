# SIVERA untuk Google Apps Script (GAS)

Paket ini adalah versi **Google Apps Script** dari aplikasi SIVERA: pencatatan, pemantauan, dan verifikasi setoran pendapatan **79 unit** — 63 Kereta Api, 13 titik Parkir, 2 Loko Cafe (Tawang & Poncol), dan Booth Loko.

| Berkas | Isi |
| --- | --- |
| `Code.gs` | Seluruh backend: setup spreadsheet, seed 79 unit, CRUD setoran, verifikasi, verifikasi massal, kalender, slip + terbilang, simpan bukti ke Drive, reminder harian, API JSON (`doGet`/`doPost`) |
| `Index.html` | Shell UI (Tailwind CDN) dengan 5 tab: Dashboard, Input, Verifikasi, Kalender, Slip |
| `Styles.html` | CSS aplikasi + **CSS cetak A4** untuk slip |
| `JavaScript.html` | Logika klien: `google.script.run` wrapper, render tabel, modal verifikasi, kalender, cetak slip |
| `appsscript.json` | Manifest (timezone, scope OAuth, konfigurasi web app) |

## 1. Cara memasang (5 menit)

1. Buka <https://script.google.com> → **New project**.
2. Aktifkan manifest: **Project Settings → Show "appsscript.json" manifest file**.
3. Buat 4 file HTML (`Index`, `Styles`, `JavaScript`) melalui **File → New → HTML file** (namanya harus sama), lalu salin isi berkas di folder ini. Salin juga `Code.gs` ke `Code.gs` dan `appsscript.json`.
4. Jalankan fungsi **`setupSpreadsheet_`** satu kali (Run → izinkan akses). Sistem akan:
   - membuat Spreadsheet `SIVERA — Setoran & Verifikasi Pendapatan`,
   - membuat sheet `MasterUnit`, `Setoran`, `LogVerifikasi`, `Slip`, `Pengaturan`, `Pengguna`,
   - mengisi **79 unit** + pengaturan kop slip.
5. **Deploy → New deployment → Web app**:
   - *Description*: `SIVERA v1`
   - *Execute as*: **Me**
   - *Who has access*: **Anyone within your organisation** (atau *Anyone* untuk demo)
6. Buka URL `/exec`. Untuk mode uji, gunakan URL `/dev`.

## 2. Struktur sheet (database)

| Sheet | Kolom |
| --- | --- |
| `MasterUnit` | id, kode_unit, nama_unit, nomor_unit, **kategori** (`ka`/`parkir`/`cafe`/`booth`), relasi, layanan, status_aktif, created_at |
| `Setoran` | id, kode_setoran, tanggal_dinas, unit_id, shift, petugas, tunai, non_tunai, total, bukti_nama, bukti_url, status, jenis_selisih, nominal_selisih, catatan_verifikator, verifikator, verified_at, dibuat_oleh, created_at |
| `LogVerifikasi` | id, setoran_id, aksi, status_sebelum, status_sesudah, aktor, catatan, created_at |
| `Slip` | id, nomor_referensi, token, jenis, periode_mulai, periode_selesai, unit_id, kategori, jumlah_transaksi, grand_total, terbilang, dicetak_oleh, snapshot (JSON), created_at |
| `Pengaturan` | key, value (nama_unit, alamat_unit, nama_kepala_unit, nama_verifikator) |
| `Pengguna` | email, nama, role (`admin`/`sales`/`crew`/`kasir`), status_aktif |

## 3. Alur 4 modul di GAS

1. **Master Unit** — `getMasterUnits()` membaca `MasterUnit`; `simpanUnit()` menambah/mengubah unit (dipakai lewat menu **SIVERA → Isi 79 Master Unit**).
2. **Input Setoran** — `simpanSetoran()`: validasi tanggal/nominal/petugas, cek unit aktif, **cegah duplikat** (`unit_id` + `tanggal_dinas`), simpan foto ke **Google Drive** (`simpanBuktiKeDrive_`) lalu tulis baris dengan status `menunggu`. `LockService` mencegah race condition saat dua orang menyimpan bersamaan.
3. **Kalender** — `getKalender(bulan)` mengagregasi `jumlah`, `total`, `terverifikasi`, `menunggu`, `selisih` per tanggal; UI mewarnai hijau/kuning/merah dan detail tanggal tampil di bawah grid.
4. **Verifikasi (Kasir)** — `verifikasiSetoran()` (setujui/revisi selisih + catatan + timestamp + log) dan `verifikasiMassal()`; UI menyediakan checkbox massal.
5. **Slip** — `buatSlip()` hanya mengambil `status = terverifikasi`, membuat nomor `SLP/{KA|PRK|CFE|BTH|ALL}/YYYYMMDD/001`, snapshot JSON, terbilang, token; QR memakai `quickchart.io/qr`; cetak dengan `window.print()` (CSS A4).

## 4. API JSON (integrasi)

`GET /exec?api=slip&token=TOKEN` → JSON slip + snapshot (untuk QR validasi publik).
`GET /exec?api=units&kategori=parkir` → daftar unit.

`POST /exec` dengan JSON:

```json
{ "action": "simpanSetoran", "payload": { "tanggal_dinas": "2026-11-21", "unit_id": "…", "petugas": "Bagus", "tunai": 750000, "non_tunai": 150000 } }
```

`action` yang tersedia: `simpanSetoran`, `verifikasi`, `verifikasiMassal`, `buatSlip`.

## 5. Batasan GAS & cara menanganinya

| Batasan | Penanganan di paket ini |
| --- | --- |
| Tidak ada relasi/constraint SQL | Validasi di `Code.gs` + `LockService` + cek duplikat manual |
| Waktu eksekusi ±6 menit / request | Baca per request, hindari loop berat; untuk data besar gunakan `CacheService` atau paginasi |
| Ukuran file/base64 | Foto dikompres di klien (disarankan < 2 MB) sebelum dikirim |
| QR eksternal | `quickchart.io/qr`; alternatif: buat QR di dalam HTML dengan library lokal |
| Auth | `Session.getActiveUser().getEmail()` + sheet `Pengguna` untuk RBAC; `executeAs: USER_DEPLOYING` |
| Cetak | CSS `@page A4` + `window.print()`; alternatif template Google Docs (`DocumentApp`) untuk PDF resmi |
| Notifikasi | `MailApp` + trigger harian `createDailyTrigger()` (21:00 WIB) |

## 6. Tips migrasi data

Jika ingin memindahkan data dari versi PostgreSQL/Next.js: ekspor tabel `unit_setoran` dan `setoran` menjadi CSV, lalu **File → Import → Append to current sheet** dengan urutan kolom sesuai tabel di atas. Pastikan `unit_id` pada `Setoran` sama dengan `id` pada `MasterUnit`.
