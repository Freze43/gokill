import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pengguna } from "@/db/schema";
import { ROLE_ORDER, type ActorRole } from "@/lib/roles";

export const SESSION_COOKIE = "sivera_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

const SECRET = process.env.AUTH_SECRET ?? "sivera-dev-secret-change-me-in-production-2026";

export type SessionUser = {
  id: number;
  nama: string;
  email: string;
  role: ActorRole;
  exp?: number;
};

/* ===================== PASSWORD ===================== */
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const parts = String(stored ?? "").split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  const derived = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  if (derived.length !== expectedBuffer.length) return false;
  return timingSafeEqual(derived, expectedBuffer);
}

/* ===================== SESSION TOKEN ===================== */
function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createSessionToken(user: SessionUser) {
  const body = {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
    if (!parsed?.id || !ROLE_ORDER.includes(parsed.role)) return null;
    if (parsed.exp && parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ===================== SERVER HELPERS ===================== */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(user: SessionUser) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Verifikasi kredensial + status aktif akun. */
export async function authenticate(email: string, password: string) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized || !password) return { ok: false as const, message: "Email dan kata sandi wajib diisi" };

  const rows = await db.select().from(pengguna).where(eq(pengguna.email, normalized)).limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false as const, message: "Email atau kata sandi salah" };
  }
  if (!user.statusAktif) {
    return { ok: false as const, message: "Akun dinonaktifkan. Hubungi Admin." };
  }
  await db.update(pengguna).set({ lastLoginAt: new Date() }).where(eq(pengguna.id, user.id));

  const session: SessionUser = {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role as ActorRole,
  };
  return { ok: true as const, session };
}

/** Penjaga API: mengembalikan user bila berhak, atau Response 401/403. */
export async function requireRole(allowed: ActorRole[] | "any") {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, response: Response.json({ ok: false, message: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 }) };
  }
  if (allowed !== "any" && !allowed.includes(session.role)) {
    return {
      ok: false as const,
      response: Response.json(
        { ok: false, message: `Akses ditolak. Aksi ini hanya untuk ${allowed.join(" / ")}.` },
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, session };
}

/** Penjaga halaman: peran tidak berhak → dialihkan (tidak ada data yang dikirim). */
export async function requirePageRole(allowed: ActorRole[]) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!allowed.includes(session.role)) redirect("/?denied=1");
  return session;
}
