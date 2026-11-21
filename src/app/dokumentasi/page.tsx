import Link from "next/link";
import { IconArrowRight, IconCheck, IconPrinter, IconQr, IconReceipt, IconShieldCheck, IconTrain, IconUsers } from "@/components/icons";
import { PageHeader, SectionCard } from "@/components/ui";
import { ROLE_META, ROLE_ORDER, ROLE_PERMISSIONS, PERMISSION_ROWS } from "@/lib/roles";

export const metadata = { title: "Skema Database & Alur — SIVERA" };

const TABLES = [
  {
    name: "unit_setoran",
    label: "Modul 1 · Master Unit (KA · Parkir · Cafe · Booth)",
    color: "sky",
    pk: "id",
    columns: [
      ["id", "serial PK", "Primary key"],
      ["kode_unit", "varchar(24) UNIQUE", "Kode unik, e.g. ABA-001 / PRK-P01 / CFE-TWG"],
      ["nama_unit", "varchar(120)", "Nama KA / titik parkir / outlet"],
      ["nomor_unit", "varchar(16)", "Nomor KA (1–63) / P01–P13 / CF01 / BH01"],
      ["kategori", "varchar(16)", "ka | parkir | cafe | booth"],
      ["relasi", "varchar(180)", "Rute perjalanan / lokasi parkir / outlet"],
      ["layanan", "varchar(80)", "Eksekutif, Parkir Harian, Cafe & Resto, Retail…"],
      ["status_aktif", "boolean", "Tampil pada dropdown jika true"],
      ["created_at / updated_at", "timestamptz", "Audit waktu"],
    ],
  },
  {
    name: "setoran",
    label: "Modul 2 & 3 · Setoran + Verifikasi",
    color: "amber",
    pk: "id",
    columns: [
      ["id", "serial PK", "Primary key"],
      ["kode_setoran", "varchar(32) UNIQUE", "STR-YYYYMMDD-NNN"],
      ["tanggal_dinas", "date", "Tanggal transaksi/dinas"],
      ["unit_id", "integer FK → unit_setoran.id", "Relasi ke unit (KA / parkir / cafe / booth)"],
      ["shift", "varchar(24)", "Pagi / Siang / Malam"],
      ["petugas", "varchar(120)", "Kondektur / petugas penyetor"],
      ["tunai", "bigint", "Pendapatan cash (IDR)"],
      ["non_tunai", "bigint", "QRIS / EDC (IDR)"],
      ["total", "bigint", "tunai + non_tunai"],
      ["bukti_nama / bukti_tipe / bukti_data", "text", "Foto resi (data-URL / path)"],
      ["status", "varchar(24)", "menunggu | terverifikasi | selisih"],
      ["jenis_selisih / nominal_selisih", "varchar(16) / bigint", "kurang | lebih + nominal"],
      ["catatan_verifikator", "text", "Catatan revisi / persetujuan"],
      ["verifikator / verified_at", "varchar(120) / timestamptz", "Nama & waktu verifikasi"],
      ["dibuat_oleh / created_at", "varchar(120) / timestamptz", "Pencatat & waktu input"],
      ["UNIQUE (unit_id, tanggal_dinas)", "index komposit", "Satu unit satu setoran per tanggal"],
    ],
  },
  {
    name: "riwayat_verifikasi",
    label: "Audit trail Modul 3",
    color: "violet",
    pk: "id",
    columns: [
      ["id", "serial PK", "Primary key"],
      ["setoran_id", "integer FK → setoran.id", "Cascade delete"],
      ["aksi", "varchar(40)", "dibuat | setujui | revisi | setujui_massal"],
      ["status_sebelum / status_sesudah", "varchar(24)", "Jejak perubahan status"],
      ["aktor", "varchar(120)", "Verifikator / petugas"],
      ["catatan", "text", "Alasan / keterangan"],
      ["created_at", "timestamptz", "Waktu aksi"],
    ],
  },
  {
    name: "slip_setoran",
    label: "Modul 4 · Slip Terverifikasi",
    color: "emerald",
    pk: "id",
    columns: [
      ["id", "serial PK", "Primary key"],
      ["nomor_referensi", "varchar(64) UNIQUE", "SLP/KA/YYYYMMDD/001"],
      ["token", "varchar(40) UNIQUE", "Token validasi QR"],
      ["jenis", "varchar(24)", "harian | per_unit | gabungan"],
      ["periode_mulai / periode_selesai", "date", "Rentang tanggal setoran"],
      ["unit_id", "integer NULL", "Diisi untuk slip per unit"],
      ["kategori", "varchar(16) NULL", "Kategori unit untuk prefix nomor slip"],
      ["jumlah_transaksi / grand_total", "integer / bigint", "Rekap slip"],
      ["terbilang", "text", "Kalimat terbilang rupiah"],
      ["dicetak_oleh / created_at", "varchar(120) / timestamptz", "Penerbit slip"],
      ["snapshot", "jsonb", "Snapshot baris saat diterbitkan"],
    ],
  },
  {
    name: "pengguna",
    label: "Autentikasi & RBAC",
    color: "rose",
    pk: "id",
    columns: [
      ["id", "serial PK", "Primary key"],
      ["email", "varchar(160) UNIQUE", "Login pengguna"],
      ["nama", "varchar(120)", "Nama tampil pada slip & audit"],
      ["role", "varchar(16)", "admin | sales | crew | kasir"],
      ["password_hash", "text", "scrypt + salt"],
      ["status_aktif", "boolean", "Nonaktif = tidak dapat login"],
      ["last_login_at", "timestamptz", "Jejak login terakhir"],
    ],
  },
  {
    name: "pengaturan",
    label: "Kop & Penandatangan",
    color: "slate",
    pk: "id",
    columns: [
      ["id", "serial PK", "Primary key"],
      ["nama_unit", "varchar(160)", "Kop instansi pada slip"],
      ["alamat_unit", "text", "Alamat unit kerja"],
      ["nama_kepala_unit", "varchar(120)", "Kolom “Diketahui Oleh”"],
      ["nama_verifikator", "varchar(120)", "Verifikator default"],
      ["updated_at", "timestamptz", "Waktu perubahan"],
    ],
  },
];

const FLOWS = [
  { icon: IconTrain, title: "Master 79 Unit", text: "63 KA + 13 Parkir + 2 Loko Cafe + Booth Loko. Dropdown searchable per kategori." },
  { icon: IconReceipt, title: "Input (Sales/Crew)", text: "Sales di desktop, Crew via HP (kamera). Status awal Menunggu." },
  { icon: IconShieldCheck, title: "Verifikasi (Kasir)", text: "Setujui (nama kasir + timestamp) atau revisi selisih kurang/lebih." },
  { icon: IconPrinter, title: "Slip (Kasir)", text: "Hanya data terverifikasi. Nomor otomatis, terbilang, QR token." },
];

const GAS_MAP = [
  ["unit_setoran", "Sheet «MasterUnit»", "ID | Kode_Unit | Nama_Unit | Nomor_Unit | Kategori | Relasi | Layanan | Status_Aktif"],
  ["setoran", "Sheet «Setoran»", "ID | Kode_Setoran | Tanggal_Dinas | Master_KA_ID | Shift | Petugas | Tunai | NonTunai | Total | Bukti_URL | Status | Jenis_Selisih | Nominal_Selisih | Catatan | Verifikator | Verified_At"],
  ["riwayat_verifikasi", "Sheet «LogVerifikasi»", "appendRow() setiap aksi verifikasi / revisi massal"],
  ["slip_setoran", "Sheet «Slip»", "Nomor_Referensi | Token | Jenis | Periode | Jumlah | Grand_Total | Terbilang | Dicetak_Oleh | JSON_Snapshot"],
  ["pengaturan", "Sheet «Pengaturan»", "Key–Value untuk kop instansi, kepala unit, verifikator"],
  ["peran (RBAC)", "Sheet «Pengguna»", "Email | Nama | Role (admin/sales/crew/kasir) | Status_Aktif — dicek di setiap fungsi server"],
  ["Bukti setor", "Drive folder / Base64", "uploadFile() → simpan URL pada kolom Bukti; QR via api.qrserver.com atau Chart API"],
];

export default function DokumentasiPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Panduan teknis"
        title="Rancangan Struktur Database & Alur Sistem"
        description="Lima tabel relasional yang menghubungkan keempat modul untuk 79 unit setoran (63 KA + 13 Parkir + 2 Loko Cafe + Booth Loko). Skema ini juga dapat dipetakan langsung ke Google Sheets bila dipublikasikan sebagai web app Google Apps Script."
        actions={
          <>
            <Link href="/master-unit" className="rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50">
              Master Unit
            </Link>
            <Link href="/slip" className="rounded-lg border border-line bg-white px-3 py-2 text-[0.76rem] font-semibold text-ink-800 hover:bg-slate-50">
              Slip &amp; Rekap
            </Link>

          </>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {FLOWS.map((flow, index) => {
          const Icon = flow.icon;
          return (
            <div key={flow.title} className="relative card p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-800 text-brand-300">
                  <Icon size={16} />
                </span>
                <p className="text-[0.82rem] font-bold text-ink-900">
                  <span className="numeric mr-1 text-slate-300">0{index + 1}</span>
                  {flow.title}
                </p>
              </div>
              <p className="mt-2 text-[0.72rem] leading-relaxed text-slate-500">{flow.text}</p>
              {index < FLOWS.length - 1 && (
                <IconArrowRight size={16} className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-ink-300 xl:block" />
              )}
            </div>
          );
        })}
      </div>

      <SectionCard title="Relasi Antar Tabel" description="Kardinalitas & integritas referensial">
        <div className="grid gap-2 text-[0.76rem] md:grid-cols-2">
          {[
            ["unit_setoran", "1 ─── N", "setoran", "Satu unit (KA/parkir/cafe/booth) punya banyak setoran. FK: setoran.unit_id"],
            ["setoran", "1 ─── N", "riwayat_verifikasi", "Setiap aksi verifikasi dicatat sebagai audit trail. FK: riwayat_verifikasi.setoran_id"],
            ["setoran", "N ─── N", "slip_setoran", "Slip gabungan menarik banyak setoran; snapshot JSONB menyimpan detailnya"],
            ["pengaturan", "1", "slip_setoran", "Kop & penandatangan dipakai saat slip diterbitkan (disalin ke snapshot)"],
            ["pengguna", "1 ─── N", "setoran / log", "Aktor pada input & verifikasi berasal dari akun yang login"],
          ].map(([left, rel, right, note]) => (
            <div key={`${left}-${right}`} className="rounded-xl border border-line bg-slate-50/60 px-3 py-2.5">
              <p className="flex flex-wrap items-center gap-2 font-mono text-[0.72rem] font-semibold text-ink-900">
                <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-line">{left}</span>
                <span className="text-slate-400">{rel}</span>
                <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-line">{right}</span>
              </p>
              <p className="mt-1 text-[0.7rem] leading-relaxed text-slate-500">{note}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-dashed border-line p-3">
          <p className="text-[0.66rem] font-bold uppercase tracking-wide text-slate-400">Siklus status setoran</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem] font-semibold">
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200">Menunggu Verifikasi</span>
            <IconArrowRight size={14} className="text-slate-300" />
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">Terverifikasi</span>
            <span className="text-slate-300">atau</span>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700 ring-1 ring-rose-200">Revisi / Selisih</span>
            <IconArrowRight size={14} className="text-slate-300" />
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">Perbaikan petugas</span>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-3 xl:grid-cols-2">
        {TABLES.map((table) => (
          <div key={table.name} className="card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <div>
                <p className="font-mono text-[0.82rem] font-bold text-ink-900">{table.name}</p>
                <p className="text-[0.66rem] text-slate-500">{table.label}</p>
              </div>
              <span className="rounded bg-ink-50 px-2 py-0.5 text-[0.6rem] font-semibold text-ink-700">PK: {table.pk}</span>
            </div>
            <table className="w-full text-left text-[0.7rem]">
              <thead>
                <tr className="bg-slate-50/70 text-[0.58rem] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-1.5 font-semibold">Kolom</th>
                  <th className="px-2 py-1.5 font-semibold">Tipe / Constraint</th>
                  <th className="px-3 py-1.5 font-semibold">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {table.columns.map(([column, type, note]) => (
                  <tr key={column}>
                    <td className="px-3 py-1.5 font-mono text-[0.66rem] text-ink-800">{column}</td>
                    <td className="px-2 py-1.5 font-mono text-[0.62rem] text-sky-700">{type}</td>
                    <td className="px-3 py-1.5 text-slate-500">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>


      <SectionCard
        title="4 Peran & Matriks Hak Akses"
        description="Pembagian kewenangan Admin · Sales · Crew · Kasir pada setiap modul"
        bodyClassName="p-0"
      >
        <div className="grid gap-2 border-b border-line p-3 sm:grid-cols-2 xl:grid-cols-4">
          {ROLE_ORDER.map((role) => (
            <div key={role} className="rounded-xl border border-line bg-slate-50/60 p-3">
              <div className="flex items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-lg text-[0.66rem] font-bold text-white ${ROLE_META[role].tone}`}>
                  {ROLE_META[role].inisial}
                </span>
                <div>
                  <p className="text-[0.8rem] font-bold text-ink-900">{ROLE_META[role].label}</p>
                  <p className="text-[0.62rem] text-slate-500">{ROLE_META[role].deskripsi}</p>
                </div>
              </div>
              <p className="mt-2 text-[0.68rem] leading-relaxed text-slate-500">{ROLE_META[role].tanggungJawab}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[0.72rem]">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-[0.6rem] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-semibold">Modul / Kewenangan</th>
                {ROLE_ORDER.map((role) => (
                  <th key={role} className="px-3 py-2 text-center font-semibold">{ROLE_META[role].label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-1.5">
                    <span className="block font-semibold text-ink-900">{row.label}</span>
                    <span className="block text-[0.62rem] text-slate-500">{row.desc}</span>
                  </td>
                  {ROLE_ORDER.map((role) => {
                    const allowed = ROLE_PERMISSIONS[role].includes(row.key);
                    return (
                      <td key={role} className="px-3 py-1.5 text-center">
                        {allowed ? (
                          <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                            <IconCheck size={12} />
                          </span>
                        ) : (
                          <span className="text-slate-300">–</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-1.5 border-t border-line bg-slate-50/60 px-4 py-2.5 text-[0.7rem] text-slate-500">
          <IconUsers size={13} className="mt-0.5 shrink-0" />
          Terapkan juga di GAS: simpan peran pada sheet «Pengguna» (email → role) dan cek dengan
          <span className="mx-1 font-mono text-[0.66rem]">Session.getActiveUser().getEmail()</span> sebelum memproses aksi
          verifikasi / cetak slip.
        </div>
      </SectionCard>

      <SectionCard title="Keamanan: Sesi & Hak Akses" description="Diterapkan di server, bukan hanya di antarmuka">
        <div className="grid gap-2 text-[0.74rem] md:grid-cols-2">
          {[
            ["Cookie HttpOnly", "Sesi 12 jam bertanda tangan HMAC-SHA256; tidak dapat dibaca/diubah JavaScript."],
            ["Middleware", "Halaman tanpa sesi dialihkan ke /login; endpoint API tanpa sesi → 401."],
            ["requireRole()", "Setiap mutasi API memeriksa peran (Admin / Sales / Crew / Kasir)."],
            ["Hash kata sandi", "scrypt + salt acak; reset kata sandi hanya oleh Admin."],
            ["Bukti setor", "Disimpan di disk public/uploads/bukti, disajikan via /api/bukti/[file] dengan validasi MIME."],
            ["Jejak audit", "Setiap input, persetujuan, dan revisi selisih dicatat dengan aktor + waktu."],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-xl border border-line bg-slate-50/60 p-2.5">
              <p className="font-semibold text-ink-900">{title}</p>
              <p className="mt-0.5 text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Pemetaan ke Google Apps Script / Google Sheets"
        description="Bila aplikasi dipublikasikan sebagai web GAS, gunakan struktur sheet berikut"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[0.72rem]">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-[0.6rem] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-semibold">Tabel PostgreSQL</th>
                <th className="px-3 py-2 font-semibold">Sheet / Penyimpanan GAS</th>
                <th className="px-3 py-2 font-semibold">Kolom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {GAS_MAP.map(([table, sheet, columns]) => (
                <tr key={table}>
                  <td className="px-4 py-2 font-mono font-semibold text-ink-800">{table}</td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{sheet}</td>
                  <td className="px-3 py-2 text-slate-500">{columns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line bg-slate-50/60 px-4 py-3 text-[0.72rem] leading-relaxed text-slate-500">
          Deploy GAS: <span className="font-mono text-[0.68rem]">Web app → Execute as “Me” → Who has access “Anyone within org”</span>.
          Handler <span className="font-mono text-[0.68rem]">doGet(e)</span> merender halaman HTML (HtmlService), sedangkan aksi
          simpan/verifikasi memakai <span className="font-mono text-[0.68rem]">google.script.run</span> untuk memanggil fungsi
          server (<span className="font-mono text-[0.68rem]">simpanSetoran()</span>,{" "}
          <span className="font-mono text-[0.68rem]">verifikasiMassal()</span>,{" "}
          <span className="font-mono text-[0.68rem]">buatSlip()</span>). Semua rumus &amp; validasi pada aplikasi ini dapat
          dipindahkan ke <span className="font-mono text-[0.68rem]">Code.gs</span> dengan SpreadsheetApp.
        </div>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-[0.74rem] font-bold text-ink-900">
            <IconQr size={15} /> Validasi &amp; cetak
          </p>
          <ul className="mt-2 space-y-1.5 text-[0.72rem] leading-relaxed text-slate-500">
            <li className="flex gap-1.5"><IconCheck size={13} className="mt-0.5 shrink-0 text-emerald-500" /> Nomor slip: SLP/KA/YYYYMMDD/001 (counter harian).</li>
            <li className="flex gap-1.5"><IconCheck size={13} className="mt-0.5 shrink-0 text-emerald-500" /> QR memuat URL /validasi/&lt;token&gt; + token unik di footer.</li>
            <li className="flex gap-1.5"><IconCheck size={13} className="mt-0.5 shrink-0 text-emerald-500" /> Layout A4 siap cetak / Simpan PDF, 3 kolom tanda tangan.</li>
            <li className="flex gap-1.5"><IconCheck size={13} className="mt-0.5 shrink-0 text-emerald-500" /> Snapshot JSONB menjaga dokumen tetap identik saat dicetak ulang.</li>
          </ul>
        </div>
        <div className="card p-4">
          <p className="text-[0.74rem] font-bold text-ink-900">Endpoint API utama</p>
          <ul className="mt-2 space-y-1 font-mono text-[0.66rem] text-slate-600">
            <li>GET/POST/PATCH/DELETE <span className="text-ink-800">/api/units</span></li>
            <li>GET/POST <span className="text-ink-800">/api/setoran</span></li>
            <li>POST <span className="text-ink-800">/api/setoran/:id/verifikasi</span></li>
            <li>POST <span className="text-ink-800">/api/setoran/verifikasi-massal</span></li>
            <li>GET <span className="text-ink-800">/api/kalender?bulan=YYYY-MM</span></li>
            <li>POST/GET <span className="text-ink-800">/api/slip</span> · GET <span className="text-ink-800">/api/qr?data=</span></li>
            <li>GET/PUT <span className="text-ink-800">/api/pengaturan</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
