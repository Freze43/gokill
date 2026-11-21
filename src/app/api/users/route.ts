import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pengguna } from "@/db/schema";
import { hashPassword, requireRole } from "@/lib/auth";
import { ROLE_ORDER } from "@/lib/roles";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 160);
}

export async function GET() {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;
  try {
    const rows = await db
      .select({
        id: pengguna.id,
        nama: pengguna.nama,
        email: pengguna.email,
        role: pengguna.role,
        statusAktif: pengguna.statusAktif,
        lastLoginAt: pengguna.lastLoginAt,
        createdAt: pengguna.createdAt,
      })
      .from(pengguna)
      .orderBy(asc(pengguna.id));
    return Response.json({ ok: true, data: rows });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal memuat pengguna" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;
  try {
    await ensureSeeded();
    const body = (await request.json()) as Record<string, unknown>;
    const nama = String(body.nama ?? "").trim();
    const email = normalizeEmail(body.email);
    const role = String(body.role ?? "crew");
    const password = String(body.password ?? "");

    if (!nama) return Response.json({ ok: false, message: "Nama wajib diisi" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ ok: false, message: "Format email tidak valid" }, { status: 400 });
    }
    if (!ROLE_ORDER.includes(role as (typeof ROLE_ORDER)[number])) {
      return Response.json({ ok: false, message: "Peran tidak valid" }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ ok: false, message: "Kata sandi minimal 6 karakter" }, { status: 400 });
    }

    const [row] = await db
      .insert(pengguna)
      .values({ nama, email, role, passwordHash: hashPassword(password), statusAktif: true })
      .returning({ id: pengguna.id, nama: pengguna.nama, email: pengguna.email, role: pengguna.role, statusAktif: pengguna.statusAktif });

    return Response.json({ ok: true, data: row, message: `Pengguna ${nama} ditambahkan` }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("uniq") || message.includes("duplicate")) {
      return Response.json({ ok: false, message: "Email sudah terdaftar" }, { status: 409 });
    }
    console.error(error);
    return Response.json({ ok: false, message: "Gagal menambah pengguna" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isFinite(id)) return Response.json({ ok: false, message: "ID tidak valid" }, { status: 400 });

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.nama === "string" && body.nama.trim()) patch.nama = body.nama.trim();
    if (typeof body.role === "string") {
      if (!ROLE_ORDER.includes(body.role as (typeof ROLE_ORDER)[number])) {
        return Response.json({ ok: false, message: "Peran tidak valid" }, { status: 400 });
      }
      patch.role = body.role;
    }
    if (typeof body.statusAktif === "boolean") patch.statusAktif = body.statusAktif;
    if (typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 6) {
        return Response.json({ ok: false, message: "Kata sandi minimal 6 karakter" }, { status: 400 });
      }
      patch.passwordHash = hashPassword(body.password);
    }
    if (id === guard.session.id && patch.statusAktif === false) {
      return Response.json({ ok: false, message: "Tidak dapat menonaktifkan akun sendiri" }, { status: 400 });
    }

    await db.update(pengguna).set(patch).where(eq(pengguna.id, id));
    return Response.json({ ok: true, message: "Data pengguna diperbarui" });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal memperbarui pengguna" }, { status: 500 });
  }
}
