/* Printable item labels from the website: the same label the phone prints (name, brand, code, QR of the barcode),
   many to a sheet. Scanning a printed label in the app opens that exact item. Opens its own tab and the browser's
   print dialog; nothing is sent anywhere. */
import QRCode from "qrcode";

export type LabelItem = { id: string; barcode?: string; modelId?: string; displayName?: string; brand?: string; partNumber?: string };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export async function printLabels(items: LabelItem[], tab: Window | null) {
  const cells = await Promise.all(items.map(async (it) => {
    const code = it.barcode || it.modelId || it.id;
    const name = it.displayName || it.modelId || it.partNumber || "Item";
    const svg = await QRCode.toString(code, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 150 });
    return `<div class="l"><div class="t"><div class="n">${esc(name)}</div>${it.brand ? `<div class="b">${esc(it.brand)}</div>` : ""}<div class="c">${esc(code)}</div></div><div class="q">${svg}</div></div>`;
  }));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Labels (${items.length})</title><style>
    @page { margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
    .g { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4mm; }
    .l { display: flex; align-items: center; justify-content: space-between; gap: 4mm; border: 1px dashed #bbb; padding: 4mm; height: 38mm; break-inside: avoid; page-break-inside: avoid; }
    .t { min-width: 0; flex: 1; }
    .n { font-size: 15px; font-weight: 800; line-height: 1.15; overflow-wrap: anywhere; max-height: 3.6em; overflow: hidden; }
    .b { font-size: 12px; color: #444; margin-top: 2px; }
    .c { font-size: 11px; font-family: monospace; color: #555; margin-top: 4px; overflow-wrap: anywhere; }
    .q svg { width: 28mm; height: 28mm; display: block; }
    @media print { .l { border-color: #ddd; } }
  </style></head><body><div class="g">${cells.join("")}</div><script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
  if (!tab) throw new Error("Your browser blocked the label window. Allow pop-ups for this site and try again.");
  tab.document.open();
  tab.document.write(html);
  tab.document.close();
}

/* One storage-box label, as the phone prints it: the big code, its name, the QR of the code (scanning it in the app
   selects the box). */
export async function printBoxLabel(box: { code: string; label?: string | null; category?: string | null }, tab: Window | null) {
  const svg = await QRCode.toString(box.code || " ", { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 260 });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Box ${esc(box.code)}</title><style>
    @page { margin: 12mm; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; text-align: center; padding: 10mm 0; }
    .code { font-size: 54px; font-weight: 800; letter-spacing: 1px; overflow-wrap: anywhere; }
    .label { font-size: 22px; color: #444; margin: 4px 0 14px; }
    .q svg { width: 70mm; height: 70mm; }
    .cat { display: inline-block; margin-top: 12px; padding: 6px 14px; border-radius: 999px; background: #eef; color: #335; font-size: 13px; font-weight: 700; text-transform: uppercase; }
  </style></head><body><div class="code">${esc(box.code)}</div>${box.label ? `<div class="label">${esc(box.label)}</div>` : ""}<div class="q">${svg}</div>${box.category ? `<div class="cat">${esc(box.category)}</div>` : ""}<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
  if (!tab) throw new Error("Your browser blocked the label window. Allow pop-ups for this site and try again.");
  tab.document.open();
  tab.document.write(html);
  tab.document.close();
}
