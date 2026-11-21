export const dynamic = "force-dynamic";

function esc(value: string) {
  return value.replace(/[<>&"']/g, (char) => {
    const map: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" };
    return map[char] ?? char;
  });
}

function formatRp(value: number) {
  return `Rp ${(Number(value) || 0).toLocaleString("id-ID")}`;
}

/** Bukti setor contoh (SVG) untuk data seed — menyerupai struk/EDC. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nomor = esc((searchParams.get("nomor") ?? "1").slice(0, 8));
  const tanggal = esc((searchParams.get("tanggal") ?? "").slice(0, 10));
  const tunai = Number(searchParams.get("tunai") ?? 0);
  const nonTunai = Number(searchParams.get("nontunai") ?? 0);
  const total = tunai + nonTunai;
  const ref = `TRX/${tanggal.replace(/-/g, "")}/${nomor.padStart(3, "0")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560">
  <defs>
    <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#ffffff"/>
      <circle cx="1" cy="1" r="0.4" fill="#eef1f5"/>
    </pattern>
  </defs>
  <rect width="420" height="560" fill="#e8edf3"/>
  <rect x="34" y="26" width="352" height="508" rx="10" fill="url(#grain)" stroke="#c9d3df"/>
  <rect x="34" y="26" width="352" height="72" rx="10" fill="#0a1e33"/>
  <rect x="34" y="88" width="352" height="10" fill="#0a1e33"/>
  <text x="210" y="58" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff">BUKTI SETOR PENDAPATAN</text>
  <text x="210" y="78" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#f9b32f">PT KERETA API INDONESIA (PERSERO) · DAOP 1 JAKARTA</text>
  <text x="62" y="124" font-family="Courier, monospace" font-size="10" fill="#4a5b6e">NO. REF</text>
  <text x="210" y="124" text-anchor="end" font-family="Courier, monospace" font-size="10" fill="#0a1e33">${ref}</text>
  <text x="62" y="142" font-family="Courier, monospace" font-size="10" fill="#4a5b6e">TANGGAL DINAS</text>
  <text x="210" y="142" text-anchor="end" font-family="Courier, monospace" font-size="10" fill="#0a1e33">${tanggal}</text>
  <text x="62" y="160" font-family="Courier, monospace" font-size="10" fill="#4a5b6e">KA</text>
  <text x="210" y="160" text-anchor="end" font-family="Courier, monospace" font-size="10" fill="#0a1e33">KA ${nomor}</text>
  <line x1="62" y1="178" x2="358" y2="178" stroke="#c9d3df" stroke-dasharray="4 3"/>
  <text x="62" y="204" font-family="Courier, monospace" font-size="10" fill="#4a5b6e">PENDAPATAN TUNAI</text>
  <text x="358" y="204" text-anchor="end" font-family="Courier, monospace" font-size="11" fill="#0a1e33">${esc(formatRp(tunai))}</text>
  <text x="62" y="228" font-family="Courier, monospace" font-size="10" fill="#4a5b6e">QRIS / EDC</text>
  <text x="358" y="228" text-anchor="end" font-family="Courier, monospace" font-size="11" fill="#0a1e33">${esc(formatRp(nonTunai))}</text>
  <line x1="62" y1="246" x2="358" y2="246" stroke="#c9d3df"/>
  <text x="62" y="272" font-family="Courier, monospace" font-size="11" font-weight="bold" fill="#0a1e33">TOTAL SETORAN</text>
  <text x="358" y="272" text-anchor="end" font-family="Courier, monospace" font-size="13" font-weight="bold" fill="#0a1e33">${esc(formatRp(total))}</text>
  <line x1="62" y1="288" x2="358" y2="288" stroke="#c9d3df" stroke-dasharray="4 3"/>
  <circle cx="210" cy="360" r="46" fill="none" stroke="#0a1e33" stroke-width="2" stroke-dasharray="6 4"/>
  <path d="M186 348h48M186 372h48M196 348v30M224 348v30" stroke="#0a1e33" stroke-width="2.5" fill="none"/>
  <text x="210" y="424" text-anchor="middle" font-family="Courier, monospace" font-size="9" fill="#4a5b6e">DOKUMEN CONTOH UNTUK SIMULASI SIVERA</text>
  <text x="210" y="440" text-anchor="middle" font-family="Courier, monospace" font-size="9" fill="#94a3b8">Bukan bukti transaksi sebenarnya</text>
  <line x1="62" y1="464" x2="358" y2="464" stroke="#c9d3df" stroke-dasharray="2 4"/>
  <text x="210" y="486" text-anchor="middle" font-family="Courier, monospace" font-size="9" fill="#4a5b6e">PETUGAS LOKET · LUNAS</text>
  <text x="210" y="504" text-anchor="middle" font-family="Courier, monospace" font-size="8" fill="#94a3b8">${esc(ref)}</text>
</svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
