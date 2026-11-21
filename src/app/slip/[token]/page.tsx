import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconShieldCheck } from "@/components/icons";
import { PrintToolbar } from "@/components/print-toolbar";
import { SlipDocument } from "@/components/slip-document";
import { getSlipByToken } from "@/lib/queries";
import type { SlipRecord, SlipSnapshot } from "@/lib/slip";
import { formatWaktu } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SlipPrintPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const slip = await getSlipByToken(token);
  if (!slip) notFound();

  const headerBag = await headers();
  const host = headerBag.get("host") ?? "localhost:3000";
  const protocol = headerBag.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const validationUrl = `${protocol}://${host}/validasi/${slip.token}`;

  const record: SlipRecord = {
    id: slip.id,
    nomorReferensi: slip.nomorReferensi,
    token: slip.token,
    jenis: slip.jenis,
    periodeMulai: slip.periodeMulai,
    periodeSelesai: slip.periodeSelesai,
    kategori: slip.kategori,
    jumlahTransaksi: slip.jumlahTransaksi,
    grandTotal: Number(slip.grandTotal),
    terbilang: slip.terbilang,
    dicetakOleh: slip.dicetakOleh,
    createdAt: slip.createdAt.toISOString(),
    snapshot: slip.snapshot as SlipSnapshot,
  };

  return (
    <div>
      <div className="no-print">
        <PrintToolbar backHref="/slip" label="Kembali ke generator" />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
          <div>
            <p className="text-[0.8rem] font-bold text-emerald-900">Slip resmi {slip.nomorReferensi}</p>
            <p className="text-[0.7rem] text-emerald-700">
              Diterbitkan {formatWaktu(slip.createdAt)} oleh {slip.dicetakOleh} · {slip.jumlahTransaksi} setoran terverifikasi
            </p>
          </div>
          <Link
            href={`/validasi/${slip.token}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[0.74rem] font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            <IconShieldCheck size={14} /> Halaman validasi publik
          </Link>
        </div>
      </div>
      <div className="print-area overflow-x-auto pb-2">
        <SlipDocument slip={record} qrSrc={`/api/qr?data=${encodeURIComponent(validationUrl)}`} />
      </div>
    </div>
  );
}
