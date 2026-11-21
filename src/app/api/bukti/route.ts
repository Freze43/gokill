import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 3_500_000;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Simpan foto bukti setor ke disk (public/uploads/bukti) agar baris database tetap ringan.
 * URL publik dilayani melalui /api/bukti/[file].
 * Body: { dataUrl: "data:image/jpeg;base64,...", nama?: string }
 */
export async function POST(request: Request) {
  const guard = await requireRole(["sales", "crew", "admin", "kasir"]);
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json()) as { dataUrl?: string; nama?: string };
    const dataUrl = String(body.dataUrl ?? "");
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      return Response.json({ ok: false, message: "Format gambar tidak valid (harus data URL base64)" }, { status: 400 });
    }
    const [, mime, base64] = match;
    const ext = EXT[mime.toLowerCase()];
    if (!ext) {
      return Response.json({ ok: false, message: "Hanya JPG, PNG, atau WEBP yang diizinkan" }, { status: 415 });
    }
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) {
      return Response.json({ ok: false, message: "Berkas kosong" }, { status: 400 });
    }
    if (buffer.length > MAX_BYTES) {
      return Response.json({ ok: false, message: "Ukuran gambar maksimal 3,5 MB setelah kompresi" }, { status: 413 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", "bukti");
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    await writeFile(path.join(dir, filename), buffer);

    return Response.json({
      ok: true,
      url: `/api/bukti/${filename}`,
      bytes: buffer.length,
      nama: String(body.nama ?? filename).slice(0, 120),
      message: "Bukti setor tersimpan",
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Gagal menyimpan bukti setor" }, { status: 500 });
  }
}
