"use client";

import { useEffect, useState } from "react";
import { IconAlert, IconCheck, IconPlus, IconRefresh, IconUsers, IconX } from "@/components/icons";
import { Callout } from "@/components/ui";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import { cn, formatWaktu } from "@/lib/utils";

type UserRow = {
  id: number;
  nama: string;
  email: string;
  role: string;
  statusAktif: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const emptyForm = { nama: "", email: "", role: "crew", password: "" };

export function UserManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [resetFor, setResetFor] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/users");
      const payload = (await response.json()) as { ok: boolean; data?: UserRow[]; message?: string };
      if (payload.ok && payload.data) setUsers(payload.data);
      else setToast({ tone: "danger", text: payload.message ?? "Gagal memuat pengguna" });
    } catch {
      setToast({ tone: "danger", text: "Gagal memuat pengguna" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addUser(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setToast({ tone: "danger", text: payload.message ?? "Gagal menambah pengguna" });
        return;
      }
      setToast({ tone: "success", text: payload.message ?? "Pengguna ditambahkan" });
      setForm(emptyForm);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function patchUser(id: number, patch: Record<string, unknown>, successText: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setToast({ tone: "danger", text: payload.message ?? "Gagal memperbarui" });
        return;
      }
      setToast({ tone: "success", text: successText });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-[0.88rem] font-bold text-ink-900">
            <IconUsers size={15} className="text-ink-600" /> Pengguna &amp; Hak Akses
          </h3>
          <p className="mt-0.5 text-[0.7rem] text-slate-500">
            Kelola akun login (email + kata sandi) dan peran. Perubahan langsung berlaku pada sesi berikutnya.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[0.72rem] font-semibold text-ink-800 hover:bg-slate-50"
        >
          <IconRefresh size={13} /> Muat ulang
        </button>
      </div>

      {toast && (
        <div
          className={cn(
            "mx-4 mt-3 flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-[0.74rem] font-medium",
            toast.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          <span className="flex items-center gap-1.5">
            {toast.tone === "success" ? <IconCheck size={14} /> : <IconAlert size={14} />} {toast.text}
          </span>
          <button onClick={() => setToast(null)} className="rounded p-0.5 hover:bg-white/60"><IconX size={12} /></button>
        </div>
      )}

      <div className="overflow-x-auto px-4 py-3">
        <table className="w-full min-w-[720px] text-left text-[0.74rem]">
          <thead>
            <tr className="border-b border-line text-[0.6rem] uppercase tracking-wide text-slate-500">
              <th className="py-2 font-semibold">Nama / Email</th>
              <th className="px-2 py-2 font-semibold">Peran</th>
              <th className="px-2 py-2 font-semibold">Status</th>
              <th className="px-2 py-2 font-semibold">Login terakhir</th>
              <th className="px-2 py-2 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {loading && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">Memuat pengguna…</td></tr>
            )}
            {!loading && users.map((user) => (
              <tr key={user.id}>
                <td className="py-2">
                  <p className="font-semibold text-ink-900">{user.nama}</p>
                  <p className="text-[0.66rem] text-slate-500">{user.email}</p>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={user.role}
                    disabled={busy}
                    onChange={(event) => void patchUser(user.id, { role: event.target.value }, `Peran ${user.nama} diperbarui`)}
                    className="rounded-md border border-line bg-white px-1.5 py-1 text-[0.7rem] font-semibold text-ink-800"
                  >
                    {ROLE_ORDER.map((role) => (
                      <option key={role} value={role}>{ROLE_META[role].label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchUser(user.id, { statusAktif: !user.statusAktif }, `Status ${user.nama} diperbarui`)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold ring-1 ring-inset",
                      user.statusAktif ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", user.statusAktif ? "bg-emerald-500" : "bg-slate-400")} />
                    {user.statusAktif ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="px-2 py-2 text-[0.68rem] text-slate-500">
                  {user.lastLoginAt ? formatWaktu(user.lastLoginAt) : "Belum pernah"}
                </td>
                <td className="px-2 py-2 text-right">
                  {resetFor === user.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Sandi baru"
                        className="w-28 rounded-md border border-line px-1.5 py-1 text-[0.68rem]"
                      />
                      <button
                        type="button"
                        disabled={busy || newPassword.length < 6}
                        onClick={async () => {
                          await patchUser(user.id, { password: newPassword }, `Kata sandi ${user.nama} direset`);
                          setResetFor(null);
                          setNewPassword("");
                        }}
                        className="rounded bg-ink-800 px-2 py-1 text-[0.64rem] font-bold text-white disabled:opacity-40"
                      >
                        Simpan
                      </button>
                      <button type="button" onClick={() => { setResetFor(null); setNewPassword(""); }} className="rounded border border-line px-1.5 py-1 text-[0.64rem] text-slate-500">
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setResetFor(user.id)}
                      className="rounded border border-line bg-white px-2 py-1 text-[0.66rem] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Reset sandi
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={addUser} className="grid gap-2 border-t border-line bg-slate-50/60 px-4 py-3 sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className="label">Nama</label>
          <input className="field py-1.5 text-[0.74rem]" value={form.nama} onChange={(event) => setForm({ ...form, nama: event.target.value })} required placeholder="Nama lengkap" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="field py-1.5 text-[0.74rem]" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required placeholder="nama@sivera.id" />
        </div>
        <div>
          <label className="label">Peran</label>
          <select className="field py-1.5 text-[0.74rem]" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            {ROLE_ORDER.map((role) => <option key={role} value={role}>{ROLE_META[role].label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Kata sandi</label>
          <input type="text" className="field py-1.5 text-[0.74rem]" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={6} placeholder="min. 6 karakter" />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[0.74rem] font-bold text-white hover:bg-ink-900 disabled:opacity-60">
            <IconPlus size={14} /> Tambah Pengguna
          </button>
        </div>
      </form>

      <div className="px-4 pb-4">
        <Callout tone="info" title="Keamanan">
          Kata sandi disimpan sebagai hash scrypt + salt. Sesi memakai cookie HttpOnly bertanda tangan HMAC (12 jam). Endpoint API
          memverifikasi peran di server, jadi pembatasan tidak bisa dilewati dari browser.
        </Callout>
      </div>
    </section>
  );
}
