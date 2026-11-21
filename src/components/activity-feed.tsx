import { KategoriBadge } from "@/components/ui";
import type { ActivityItem } from "@/lib/queries";
import { formatWaktu, rupiah, unitShort } from "@/lib/utils";

const JENIS_META: Record<ActivityItem["jenis"], { label: string; dot: string; text: string }> = {
  input: { label: "Input setoran", dot: "bg-sky-500", text: "menambahkan setoran" },
  verifikasi: { label: "Diverifikasi", dot: "bg-emerald-500", text: "menyetujui setoran" },
  revisi: { label: "Revisi selisih", dot: "bg-rose-500", text: "mengembalikan setoran" },
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-[0.76rem] text-slate-400">Belum ada aktivitas.</p>;
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const meta = JENIS_META[item.jenis];
        return (
          <li key={item.id} className="flex gap-2.5 rounded-lg px-1 py-1.5 transition hover:bg-slate-50">
            <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full ring-2 ring-white">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.74rem] leading-snug text-slate-600">
                <strong className="text-ink-900">{item.aktor}</strong> {meta.text}{" "}
                <span className="font-semibold text-ink-900">{item.namaUnit}</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[0.62rem] text-slate-400">
                <KategoriBadge kategori={item.kategori} />
                <span className="numeric">{unitShort(item)}</span>
                <span>·</span>
                <span className="numeric font-semibold text-slate-500">{rupiah(item.total)}</span>
                <span>·</span>
                <span>{formatWaktu(item.waktu)}</span>
              </p>
              {item.catatan && <p className="mt-0.5 truncate text-[0.62rem] italic text-slate-400">“{item.catatan}”</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
