"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconAlert, IconCheck, IconTrain } from "@/components/icons";
import { ROLE_META } from "@/lib/roles";
import { cn } from "@/lib/utils";

type DemoAccount = { nama: string; email: string; role: "admin" | "sales" | "crew" | "kasir" };

const DEMO_ACCOUNTS: DemoAccount[] = [
  { nama: "Admin SIVERA", email: "admin@sivera.id", role: "admin" },
  { nama: "Andi Pratama", email: "sales@sivera.id", role: "sales" },
  { nama: "Bagus Nugroho", email: "crew@sivera.id", role: "crew" },
  { nama: "Rani Puspita", email: "kasir@sivera.id", role: "kasir" },
];

const DEMO_PASSWORD = "sivera123";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("kasir@sivera.id");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; data?: { nama: string; role: string } };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Gagal masuk");
        return;
      }
      setSuccess(`Berhasil masuk sebagai ${payload.data?.nama ?? email}`);
      router.replace(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setBusy(false);
    }
  }

  function pick(account: DemoAccount) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-white shadow-float md:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-ink-900 via-ink-800 to-ink-950 p-6 text-white md:flex">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-400/25 blur-3xl" />
        <div className="relative">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-300 to-brand-500 text-ink-950">
            <IconTrain size={24} />
          </span>
          <h1 className="mt-4 text-[1.4rem] font-extrabold leading-tight">SIVERA</h1>
          <p className="mt-1 text-[0.78rem] leading-relaxed text-white/60">
            Sistem Pencatatan, Pemantauan &amp; Verifikasi Setoran Pendapatan — KA, Parkir, Loko Cafe, dan Booth Loko.
          </p>
          <ul className="mt-5 space-y-2 text-[0.74rem] text-white/70">
            {["79 unit pendapatan terintegrasi", "Verifikasi berjenjang dengan jejak audit", "Slip resmi + QR validasi", "Hak akses sesuai peran (RBAC)"].map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <IconCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-6 text-[0.62rem] text-white/35">DAOP 4 Semarang · Unit Pendapatan &amp; Verifikasi</p>
      </div>

      <div className="p-5 sm:p-6">
        <h2 className="text-[1.1rem] font-extrabold text-ink-900">Masuk ke akun Anda</h2>
        <p className="mt-0.5 text-[0.74rem] text-slate-500">Gunakan email &amp; kata sandi yang diberikan Admin.</p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@sivera.id"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Kata Sandi</label>
            <input
              id="password"
              type="password"
              className="field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[0.74rem] font-medium text-rose-700">
              <IconAlert size={14} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
          {success && (
            <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[0.74rem] font-medium text-emerald-700">
              <IconCheck size={14} /> {success}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-ink-800 px-4 py-2.5 text-[0.82rem] font-bold text-white shadow-sm transition hover:bg-ink-900 disabled:opacity-60"
          >
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-dashed border-line bg-slate-50/70 p-3">
          <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">Akun demo · sandi {DEMO_PASSWORD}</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => pick(account)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-left text-[0.7rem] font-semibold transition",
                  email === account.email ? "border-ink-700 bg-ink-800 text-white" : "border-line bg-white text-slate-600 hover:bg-white",
                )}
              >
                {ROLE_META[account.role].label}
                <span className="mt-0.5 block text-[0.58rem] font-normal opacity-70">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
