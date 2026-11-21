import { authenticate, setSessionCookie } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = (await request.json()) as { email?: string; password?: string };
    const result = await authenticate(String(body.email ?? ""), String(body.password ?? ""));
    if (!result.ok) {
      return Response.json({ ok: false, message: result.message }, { status: 401 });
    }
    await setSessionCookie(result.session);
    return Response.json({ ok: true, data: result.session, message: `Selamat datang, ${result.session.nama}` });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal memproses login" }, { status: 500 });
  }
}
