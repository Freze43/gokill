import type { SlipRecord } from "@/lib/slip";
import { SLIP_JENIS_LABEL } from "@/lib/slip";
import { formatTanggal, formatTanggalPendek, formatWaktu, kategoriMeta, rupiah } from "@/lib/utils";

function KopLogo() {
  return (
    <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-2 border-ink-800 bg-ink-900">
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#f9b32f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="13" rx="4" />
        <path d="M5 10h14M9 3v7M15 3v7M8 19l-2 3M16 19l2 3M8 16h8" />
        <circle cx="9" cy="13" r=".8" fill="#f9b32f" />
        <circle cx="15" cy="13" r=".8" fill="#f9b32f" />
      </svg>
    </div>
  );
}

export function SlipDocument({
  slip,
  qrSrc,
  withSignatures = true,
}: {
  slip: SlipRecord;
  qrSrc: string;
  withSignatures?: boolean;
}) {
  const { snapshot } = slip;
  const first = snapshot.rows[0];
  const petugasLabel = snapshot.rows.length === 1 ? first?.petugas ?? "-" : "Petugas Penyetor (terlampir)";

  return (
    <article className="print-sheet sheet-a4 mx-auto rounded-xl border border-line bg-white shadow-card print:rounded-none">
      {/* ===== KOP INSTANSI ===== */}
      <header className="avoid-break">
        <div className="flex items-start gap-3 border-b-[3px] border-double border-ink-900 pb-3">
          <KopLogo />
          <div className="min-w-0 flex-1">
            <h1 className="text-[11.5pt] font-extrabold uppercase leading-tight tracking-[0.02em] text-ink-950">
              {snapshot.unit.namaUnit}
            </h1>
            <p className="mt-0.5 text-[7.8pt] leading-snug text-slate-500">{snapshot.unit.alamatUnit}</p>
            <p className="text-[7.8pt] font-semibold uppercase tracking-[0.08em] text-ink-700">
              Unit Pendapatan &amp; Verifikasi — KA · Parkir · Loko Cafe · Booth Loko
            </p>
          </div>
          <div className="w-[172px] shrink-0 rounded-md border border-ink-200 bg-ink-800 px-2.5 py-2 text-white">
            <p className="text-[6.4pt] uppercase tracking-[0.18em] text-brand-200">Nomor Referensi</p>
            <p className="numeric text-[9.4pt] font-bold leading-tight">{slip.nomorReferensi}</p>
            <p className="mt-1 text-[6.2pt] text-white/60">Tanggal Cetak</p>
            <p className="text-[7.4pt] font-semibold">{formatTanggal(slip.createdAt.slice(0, 10), true)}</p>
          </div>
        </div>

        <div className="mt-3 text-center">
          <h2 className="text-[11pt] font-extrabold uppercase tracking-[0.14em] text-ink-950">Slip Setoran Pendapatan</h2>
          <p className="text-[7.6pt] font-medium uppercase tracking-[0.2em] text-slate-500">
            {SLIP_JENIS_LABEL[slip.jenis] ?? slip.jenis} · Data Terverifikasi
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[7.8pt]">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Periode Setoran</span>
            <span className="font-semibold text-ink-900">
              {formatTanggalPendek(slip.periodeMulai)} — {formatTanggalPendek(slip.periodeSelesai)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Jumlah Data</span>
            <span className="font-semibold text-ink-900">{slip.jumlahTransaksi} setoran terverifikasi</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Dicetak Oleh</span>
            <span className="font-semibold text-ink-900">{slip.dicetakOleh}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Status Dokumen</span>
            <span className="font-bold uppercase text-emerald-700">Terverifikasi</span>
          </div>
        </div>
      </header>

      {/* ===== TABEL RINCIAN ===== */}
      <table className="mt-3 w-full border-collapse text-[7.6pt]">
        <thead>
          <tr className="bg-ink-800 text-white">
            <th className="w-[22px] border border-ink-800 px-1 py-1.5 text-center font-semibold">No</th>
            <th className="w-[58px] border border-ink-800 px-1 py-1.5 text-left font-semibold">Tgl Dinas</th>
            <th className="border border-ink-800 px-1.5 py-1.5 text-left font-semibold">Nomor &amp; Nama KA</th>
            <th className="w-[92px] border border-ink-800 px-1 py-1.5 text-left font-semibold">Petugas Penyetor</th>
            <th className="w-[76px] border border-ink-800 px-1 py-1.5 text-right font-semibold">Tunai</th>
            <th className="w-[76px] border border-ink-800 px-1 py-1.5 text-right font-semibold">Non-Tunai</th>
            <th className="w-[82px] border border-ink-800 px-1 py-1.5 text-right font-semibold">Total</th>
            <th className="w-[70px] border border-ink-800 px-1 py-1.5 text-center font-semibold">Verifikasi</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.rows.map((row, index) => (
            <tr key={row.id} className={index % 2 === 1 ? "bg-slate-50" : "bg-white"}>
              <td className="border border-slate-300 px-1 py-[5px] text-center text-slate-600">{index + 1}</td>
              <td className="numeric border border-slate-300 px-1 py-[5px] text-slate-700">{formatTanggalPendek(row.tanggalDinas)}</td>
              <td className="border border-slate-300 px-1.5 py-[5px]">
                <span className="block font-semibold leading-tight text-ink-950">
                  {row.kategori === "ka" ? `KA ${row.nomorUnit} · ` : `[${kategoriMeta(row.kategori).singkat}] · `}
                  {row.namaUnit}
                </span>
                <span className="block text-[6.6pt] leading-tight text-slate-500">
                  {row.layanan} · {row.relasi} · Shift {row.shift}
                </span>
              </td>
              <td className="border border-slate-300 px-1 py-[5px] text-slate-700">{row.petugas}</td>
              <td className="numeric border border-slate-300 px-1 py-[5px] text-right text-slate-700">{rupiah(row.tunai)}</td>
              <td className="numeric border border-slate-300 px-1 py-[5px] text-right text-slate-700">{rupiah(row.nonTunai)}</td>
              <td className="numeric border border-slate-300 px-1 py-[5px] text-right font-semibold text-ink-950">
                {rupiah(row.total)}
              </td>
              <td className="border border-slate-300 px-1 py-[5px] text-center text-[6.6pt] leading-tight text-slate-600">
                {row.verifiedAt ? formatWaktu(row.verifiedAt) : "—"}
                <span className="mt-0.5 block text-[6pt] text-emerald-700">{row.verifikator ?? ""}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-ink-50 font-semibold text-ink-950">
            <td colSpan={4} className="border border-ink-300 px-2 py-1.5 text-right text-[7.6pt] uppercase tracking-[0.08em]">
              Grand Total Setoran
            </td>
            <td className="numeric border border-ink-300 px-1 py-1.5 text-right">{rupiah(snapshot.totalTunai)}</td>
            <td className="numeric border border-ink-300 px-1 py-1.5 text-right">{rupiah(snapshot.totalNonTunai)}</td>
            <td className="numeric border border-ink-300 px-1 py-1.5 text-right text-[8.2pt]">{rupiah(snapshot.grandTotal)}</td>
            <td className="border border-ink-300 px-1 py-1.5 text-center text-[6.4pt]">{snapshot.jumlah} data</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-2.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
        <p className="text-[6.8pt] font-semibold uppercase tracking-[0.14em] text-slate-500">Terbilang</p>
        <p className="text-[8.4pt] font-bold italic text-ink-950">{slip.terbilang}</p>
      </div>

      {/* ===== TANDA TANGAN & QR ===== */}
      {withSignatures && (
        <footer className="avoid-break mt-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center">
              <p className="text-[7.4pt] text-slate-600">Disetorkan Oleh,</p>
              <p className="text-[6.6pt] font-semibold uppercase tracking-wide text-slate-400">Petugas Sales / Crew</p>
              <div className="mt-11 w-full border-t border-dotted border-slate-400 pt-1">
                <p className="text-[8pt] font-bold text-ink-950">{petugasLabel}</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[7.4pt] text-slate-600">Diverifikasi Oleh,</p>
              <p className="text-[6.6pt] font-semibold uppercase tracking-wide text-slate-400">Kasir (Verifikator)</p>
              <div className="mt-2 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="QR validasi slip" className="h-[58px] w-[58px]" />
                <span className="text-[5.8pt] uppercase tracking-wide text-slate-400">Scan validasi</span>
              </div>
              <div className="mt-1 w-full border-t border-dotted border-slate-400 pt-1">
                <p className="text-[8pt] font-bold text-ink-950">{first?.verifikator ?? snapshot.unit.namaVerifikator}</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[7.4pt] text-slate-600">Diketahui Oleh,</p>
              <p className="text-[6.6pt] font-semibold uppercase tracking-wide text-slate-400">Kepala Unit / Admin</p>
              <div className="mt-11 w-full border-t border-dotted border-slate-400 pt-1">
                <p className="text-[8pt] font-bold text-ink-950">{snapshot.unit.namaKepalaUnit}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-300 pt-2 text-[6.4pt] text-slate-500">
            <p>
              Dokumen ini diterbitkan otomatis oleh <span className="font-semibold text-ink-800">SIVERA</span> dan hanya memuat
              setoran berstatus terverifikasi.
            </p>
            <p className="numeric text-right">
              Token validasi: <span className="font-semibold text-ink-800">{slip.token}</span>
            </p>
          </div>
        </footer>
      )}
    </article>
  );
}
