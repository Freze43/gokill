import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Sajikan bukti setor yang tersimpan di disk (aman dari path traversal). */
export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!/^[A-Za-z0-9._-]+$/.test(file) || file.includes("..")) {
    return new Response("Nama berkas tidak valid", { status: 400 });
  }
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext];
  if (!mime) return new Response("Format tidak didukung", { status: 415 });

  const fullPath = path.join(process.cwd(), "public", "uploads", "bukti", file);
  try {
    const info = await stat(fullPath);
    if (!info.isFile()) return new Response("Tidak ditemukan", { status: 404 });
    const stream = Readable.toWeb(createReadStream(fullPath)) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(info.size),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response("Tidak ditemukan", { status: 404 });
  }
}
