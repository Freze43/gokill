export default function Loading() {
  return (
    <div className="animate-fade space-y-4">
      <div className="h-28 animate-pulse rounded-2xl bg-white/70 ring-1 ring-line" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[92px] animate-pulse rounded-xl bg-white ring-1 ring-line" />
        ))}
      </div>
      <div className="h-[260px] animate-pulse rounded-xl bg-white ring-1 ring-line" />
      <p className="text-center text-[0.7rem] text-slate-400">Memuat data SIVERA…</p>
    </div>
  );
}
