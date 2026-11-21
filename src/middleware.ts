import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "sivera_session";

const PUBLIC_PATHS = ["/login", "/validasi", "/api/auth/login", "/api/auth/logout", "/api/health", "/api/qr", "/api/bukti-demo"];

/** Peta modul → peran yang berhak (enforced sebelum halaman dirender). */
const ROUTE_ROLES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/master-unit", roles: ["admin"] },
  { prefix: "/pengaturan", roles: ["admin"] },
  { prefix: "/audit", roles: ["admin"] },
  { prefix: "/verifikasi", roles: ["kasir", "admin"] },
  { prefix: "/slip", roles: ["kasir", "admin"] },
  { prefix: "/setoran/baru", roles: ["sales", "crew", "admin"] },
  { prefix: "/mobile", roles: ["sales", "crew", "admin"] },
];

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Validasi tanda tangan & masa berlaku token sesi (HMAC-SHA256, Web Crypto). */
async function verifyToken(token: string | undefined, secret: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(signature), new TextEncoder().encode(payload));
    if (!valid) return null;
    const json = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as { exp?: number; role?: string };
    if (json.exp && json.exp * 1000 < Date.now()) return null;
    return json;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? "sivera-dev-secret-change-me-in-production-2026";
  const session = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value, secret);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, message: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const rule = ROUTE_ROLES.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  if (rule && !rule.roles.includes(String(session.role))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, message: `Akses ditolak untuk peran ${session.role}.` }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "?denied=1";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|gas|download|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt|zip|xml)$).*)"],
};
