"use client";

import { useActor, ROLE_META, ROLE_ORDER, type ActorRole } from "@/components/actor-context";
import { IconShieldCheck, IconUsers } from "@/components/icons";
import { Callout, LinkButton } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Membatasi akses modul sesuai peran (Admin / Sales / Crew / Kasir).
 * Demo: peran disimpan di localStorage, bukan autentikasi produksi.
 */
export function RoleGate({
  allow,
  children,
  moduleName,
  description,
}: {
  allow: ActorRole[];
  children: React.ReactNode;
  moduleName: string;
  description?: string;
}) {
  const { actor, setRole, can } = useActor();

  if (allow.includes(actor.role)) return <>{children}</>;

  return (
    <div className="mx-auto max-w-xl">
      <div className="card animate-rise overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-line bg-amber-50/60 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <IconShieldCheck size={18} />
          </span>
          <div>
            <p className="text-[0.86rem] font-bold text-ink-900">Akses modul dibatasi</p>
            <p className="text-[0.7rem] text-slate-500">
              Peran aktif: <strong>{ROLE_META[actor.role].label}</strong> ({actor.nama})
            </p>
          </div>
        </div>
        <div className="px-4 py-4">
          <p className="text-[0.8rem] leading-relaxed text-slate-600">
            Modul <strong>{moduleName}</strong> hanya dapat diakses oleh{" "}
            <strong>{allow.map((role) => ROLE_META[role].label).join(" / ")}</strong>.
            {description ? ` ${description}` : ""}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[0.66rem] font-bold uppercase tracking-wide text-slate-400">
            <IconUsers size={13} /> Ganti peran untuk simulasi
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {ROLE_ORDER.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRole(role)}
                disabled={!allow.includes(role)}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left text-[0.74rem] font-semibold transition",
                  allow.includes(role)
                    ? "border-ink-200 bg-ink-50 text-ink-800 hover:bg-ink-100"
                    : "cursor-not-allowed border-line bg-slate-50 text-slate-300",
                )}
              >
                {ROLE_META[role].label}
                <span className="mt-0.5 block text-[0.6rem] font-normal opacity-70">{ROLE_META[role].deskripsi}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <LinkButton href={can("dashboard") ? "/" : "/setoran/baru"} variant="primary">
              Kembali ke halaman saya
            </LinkButton>
            <LinkButton href="/dokumentasi" variant="ghost">
              Lihat matriks peran
            </LinkButton>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Callout tone="info" title="Catatan implementasi">
          Pada versi produksi, pembatasan ini ditegakkan di server (middleware + RBAC pada API) memakai SSO/LDAP. Mode demo ini
          menyimulasikan peran di peramban.
        </Callout>
      </div>
    </div>
  );
}
