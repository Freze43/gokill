import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("data") ?? searchParams.get("text") ?? "").slice(0, 600);
  if (!text) {
    return new Response("Parameter data wajib diisi", { status: 400 });
  }
  try {
    const png = await QRCode.toBuffer(text, {
      type: "png",
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0a1e33ff", light: "#ffffffff" },
    });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Gagal membuat QR", { status: 500 });
  }
}
