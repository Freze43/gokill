"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActor, ROLE_META, ROLE_ORDER, ROLE_PERMISSIONS } from "@/components/actor-context";
import { PERMISSION_ROWS } from "@/lib/roles";
import { IconAlert, IconCheck, IconSave, IconShieldCheck } from "@/components/icons";
import { Callout, PageHeader, SectionCard } from "@/components/ui";
import { UserManager } from "@/components/user-manager";
import type { PengaturanData } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function PengaturanForm({ pengaturan }: { pengaturan: PengaturanData }) {
  const router = useRouter();
  const { actor } = useActor();
  const [form, setForm] = useState({
    namaUnit: pengaturan.namaUnit,
    alamatUnit: pengaturan.alamatUnit,
    namaKepalaUnit: pengaturan.namaKepalaUnit,
    namaVerifikator: pengaturan.namaVerifikator,
  });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setToast({ tone: "danger", text: payload.message ?? "Gagal menyimpan pengaturan" });
        return;
      }
      setToast({ tone: "success", text: "Pengaturan unit tersimpan dan langsung dipakai pada kop slip." });
      router.refresh();
    } catch {
      setToast({ tone: "danger", text: "Terjadi kesalahan jaringan" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Administrasi"
        title="Pengaturan Unit & Penandatangan Slip"
        description="Data ini tampil pada kop instansi slip setoran resmi (Modul 4) beserta blok tanda tangan."
      />

      {toast && (
        <div
          className={cn(
            "flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-[0.76rem] font-medium",
            toast.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          <span className="flex items-center gap-1.5">
            {toast.tone === "success" ? <IconCheck size={15} /> : <IconAlert size={15} />} {toast.text}
          </span>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Identitas Unit Kerja" description="Tampil pada kop slip setoran">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label" htmlFor="namaUnit">Nama Instansi / Unit</label>
              <input
                id="namaUnit"
                className="field"
                value={form.namaUnit}
                onChange={(event) => setForm({ ...form, namaUnit: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="alamatUnit">Alamat / Keterangan Unit</label>
              <textarea
                id="alamatUnit"
                className="field min-h-[64px] resize-y"
                value={form.alamatUnit}
                onChange={(event) => setForm({ ...form, alamatUnit: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="kepala">Nama Kepala Unit / Supervisor</label>
                <input
                  id="kepala"
                  className="field"
                  value={form.namaKepalaUnit}
                  onChange={(event) => setForm({ ...form, namaKepalaUnit: event.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="verifikator">Kasir / Verifikator Utama</label>
                <input
                  id="verifikator"
                  className="field"
                  value={form.namaVerifikator}
                  onChange={(event) => setForm({ ...form, namaVerifikator: event.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-line pt-3">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-4 py-2 text-[0.78rem] font-bold text-white hover:bg-ink-900 disabled:opacity-60"
              >
                <IconSave size={15} /> {busy ? "Menyimpan…" : "Simpan Pengaturan"}
              </button>
            </div>
          </form>
        </SectionCard>

        <div className="space-y-3">
          <SectionCard title="Akun Saya" description="Identitas sesi aktif">
            <dl className="space-y-1.5 text-[0.76rem]">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Nama</dt><dd className="font-semibold text-ink-900">{actor.nama}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Peran</dt><dd className="font-semibold text-ink-900">{ROLE_META[actor.role].label}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Modul</dt><dd className="font-semibold text-ink-900">{ROLE_PERMISSIONS[actor.role].length} hak akses</dd></div>
            </dl>
            <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[0.68rem] leading-relaxed text-slate-500">
              Peran &amp; nama berasal dari sesi login server. Untuk mengubahnya, kelola di tabel Pengguna di bawah atau minta
              Admin menyesuaikan.
            </p>
          </SectionCard>

          <Callout tone="info" title="Keamanan produksi">
            Mode demo ini tidak memakai autentikasi. Untuk implementasi produksi, sambungkan SIVERA dengan SSO/LDAP perusahaan
            dan batasi akses modul sesuai peran (RBAC).
          </Callout>

          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">
              <IconShieldCheck size={13} /> Alur dokumen
            </p>
            <ol className="mt-2 space-y-1.5 text-[0.72rem] leading-relaxed text-slate-600">
              <li>1. Petugas input setoran + bukti → status Menunggu.</li>
              <li>2. Verifikator memeriksa → Terverifikasi / Selisih.</li>
              <li>3. Slip hanya menarik data Terverifikasi.</li>
              <li>4. Slip diberi nomor, QR, dan token validasi publik.</li>
            </ol>
          </div>
        </div>
      </div>

      <UserManager />

      <SectionCard
        title="Matriks Hak Akses 4 Peran"
        description="Kewenangan tiap peran pada setiap modul SIVERA"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[0.74rem]">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-[0.62rem] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-semibold">Modul / Kewenangan</th>
                {ROLE_ORDER.map((role) => (
                  <th key={role} className="px-3 py-2 text-center font-semibold">
                    {ROLE_META[role].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-2">
                    <span className="block font-semibold text-ink-900">{row.label}</span>
                    <span className="block text-[0.66rem] text-slate-500">{row.desc}</span>
                  </td>
                  {ROLE_ORDER.map((role) => {
                    const allowed = ROLE_PERMISSIONS[role].includes(row.key);
                    return (
                      <td key={role} className="px-3 py-2 text-center">
                        <span
                          className={cn(
                            "inline-grid h-5 w-5 place-items-center rounded-full text-[0.62rem] font-bold",
                            allowed ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-300",
                          )}
                        >
                          {allowed ? <IconCheck size={12} /> : "–"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
