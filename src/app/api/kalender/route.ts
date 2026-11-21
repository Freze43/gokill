import { getCalendarMonth, getDayDetail, getUnits } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get("tanggal");
    if (tanggal) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
        return Response.json({ ok: false, message: "Tanggal tidak valid" }, { status: 400 });
      }
      const rows = await getDayDetail(tanggal);
      return Response.json({ ok: true, tanggal, data: rows });
    }

    const bulan = searchParams.get("bulan") ?? new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(bulan)) {
      return Response.json({ ok: false, message: "Format bulan harus YYYY-MM" }, { status: 400 });
    }
    const trains = await getUnits();
    const aktif = trains.filter((train) => train.statusAktif).length;
    const data = await getCalendarMonth(bulan, trains.length || 63);
    return Response.json({ ok: true, ...data, totalUnit: aktif || data.totalUnit, totalMaster: trains.length });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal memuat kalender" }, { status: 500 });
  }
}
