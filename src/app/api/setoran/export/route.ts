import { getDeposits } from "@/lib/queries";
import { formatTanggal, formatWaktu, kategoriMeta, statusMeta } from "@/lib/utils";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Ekspor data setoran (mengikuti filter aktif) ke CSV siap Excel. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      dari: searchParams.get("dari") ?? undefined,
      sampai: searchParams.get("sampai") ?? undefined,
      unitId: searchParams.get("unitId") ? Number(searchParams.get("unitId")) : undefined,
      kategori: searchParams.get("kategori") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    };

    const first = await getDeposits({ ...filters, page: 1, pageSize: 200 });
    const totalPages = Math.min(first.totalPages, 40);
    const rows = [...first.rows];
    for (let page = 2; page <= totalPages; page += 1) {
      const next = await getDeposits({ ...filters, page, pageSize: 200 });
      rows.push(...next.rows);
    }

    const header = [
      "Kode Setoran",
      "Tanggal Dinas",
      "Kategori",
      "Kode Unit",
      "Nomor Unit",
      "Nama Unit",
      "Relasi / Lokasi",
      "Layanan",
      "Shift",
      "Petugas",
      "Tunai",
      "Non Tunai",
      "Total",
      "Status",
      "Jenis Selisih",
      "Nominal Selisih",
      "Verifikator",
      "Waktu Verifikasi",
      "Catatan Verifikator",
      "Dibuat Oleh",
    ];

    const lines = [header.map(csvCell).join(",")];
    for (const row of rows) {
      lines.push(
        [
          row.kodeSetoran,
          row.tanggalDinas,
          kategoriMeta(row.kategori).label,
          row.kodeUnit,
          row.nomorUnit,
          row.namaUnit,
          row.relasi,
          row.layanan,
          row.shift,
          row.petugas,
          Number(row.tunai),
          Number(row.nonTunai),
          Number(row.total),
          statusMeta(row.status).label,
          row.jenisSelisih ?? "",
          Number(row.nominalSelisih),
          row.verifikator ?? "",
          row.verifiedAt ? formatWaktu(row.verifiedAt) : "",
          row.catatanVerifikator ?? "",
          row.dibuatOleh,
        ]
          .map(csvCell)
          .join(","),
      );
    }

    const total = rows.reduce((sum, row) => sum + Number(row.total), 0);
    lines.push("");
    lines.push([csvCell("TOTAL"), ...Array(11).fill(csvCell("")), csvCell(total)].join(","));
    lines.push([csvCell("Jumlah baris"), csvCell(rows.length), csvCell("Diekspor"), csvCell(formatTanggal(new Date(), true))].join(","));

    const name = `setoran-${filters.dari ?? "awal"}_${filters.sampai ?? "akhir"}.csv`;
    return new Response("\uFEFF" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal mengekspor data" }, { status: 500 });
  }
}
