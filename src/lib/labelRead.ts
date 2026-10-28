/* Reading labels from photos: the website's side.
   The server (ocr-read-item) reads a photo and keeps what it found on the
   item as a suggestion. Nothing on the item changes until an admin presses
   Apply (inventory_ocr_apply), and Apply can be undone (inventory_ocr_undo).
   The barcode rules (check digit, scanned barcode stays) are in the database. */
import { supabase } from "@/lib/supabase";

export type OcrBox = { t: string; l: number; tp: number; w: number; h: number };

export type OcrSuggestion = {
  v: number;
  read_at: string;
  photo: string;
  photo_kind: string | null;
  via: string;
  text: string;
  fields: {
    display_name: string | null;
    brand: string | null;
    part_number: string | null;
    barcode: string | null;
    barcode_candidates: string[];
    skus: string[];
    long_numbers: string[];
    model_numbers: string[];
  };
  conflicts: Array<{ type: string; detail: string }>;
  boxes: OcrBox[];
  image: { w: number; h: number } | null;
};

export type ApplyResult = { applied: Record<string, string | null>; skipped: Record<string, string> };

/* The barcode check digit (UPC-A 12 / EAN-13 13). Same rule as the server. */
export function gtinCheckOk(digits: string): boolean {
  if (!/^\d{8,14}$/.test(digits)) return false;
  let sum = 0;
  for (let i = digits.length - 2, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += Number(digits[i]) * w;
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

export function isBarcodeNumber(digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  if (d.length === 12) return !"245".includes(d[0]) && gtinCheckOk(d);
  if (d.length === 13) return d[0] !== "2" && gtinCheckOk(d);
  return false;
}

/* UPC-A is an EAN-13 with a 0 in front. */
export function sameBarcode(a?: string | null, b?: string | null): boolean {
  const x = (a || "").replace(/\D/g, ""), y = (b || "").replace(/\D/g, "");
  if (!x || !y) return false;
  const strip = (v: string) => (v.length === 13 && v[0] === "0" ? v.slice(1) : v);
  return strip(x) === strip(y);
}

async function reason(error: unknown, fallback: string): Promise<string> {
  try {
    const ctx = (error as { context?: Response })?.context;
    if (ctx && typeof ctx.json === "function") {
      const b = await ctx.json();
      if (b?.error) return String(b.error);
    }
  } catch { /* fall through */ }
  return (error as { message?: string })?.message && !/non-2xx/i.test(String((error as { message?: string }).message))
    ? String((error as { message?: string }).message) : fallback;
}

/* Shrink a photo in the browser to fit the reader's 1 MB limit. */
async function shrinkToDataUrl(url: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("The photo could not be opened."));
    el.src = url;
  });
  const edge = 1600;
  const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  for (const q of [0.82, 0.7, 0.55]) {
    const d = c.toDataURL("image/jpeg", q);
    if (d.length < 1_300_000) return d;
  }
  throw new Error("That photo is too large to read.");
}

export type ReadOutcome =
  | { ok: true; suggestion: OcrSuggestion; flags: string[]; skipped?: undefined }
  | { ok: true; skipped: string; suggestion?: OcrSuggestion; flags?: undefined }
  | { ok: false; message: string; limited?: boolean };

/* Ask the server to read one item's photo. force re-reads a photo already read. */
export async function readItemPhoto(itemId: string, opts: { photo?: string; force?: boolean } = {}): Promise<ReadOutcome> {
  const body: Record<string, unknown> = { item_id: itemId, force: !!opts.force };
  if (opts.photo) body.photo_url = opts.photo;
  let { data, error } = await supabase.functions.invoke("ocr-read-item", { body });
  if (error) {
    let payload: { error?: string; needs_resize?: boolean; photo?: string } | null = null;
    try { payload = await (error as { context?: Response }).context?.clone().json(); } catch { /* none */ }
    if (payload?.needs_resize && payload.photo) {
      // Over the reader's size limit: shrink it here and send it along.
      try {
        const image = await shrinkToDataUrl(payload.photo);
        ({ data, error } = await supabase.functions.invoke("ocr-read-item", { body: { ...body, photo_url: payload.photo, image, force: true } }));
      } catch (e) {
        return { ok: false, message: (e as Error).message || "That photo is too large to read." };
      }
    }
    if (error) {
      const message = await reason(error, "The photo could not be read.");
      return { ok: false, message, limited: /limit/i.test(message) };
    }
  }
  if (data?.suggestion && !data.skipped) return { ok: true, suggestion: data.suggestion as OcrSuggestion, flags: (data.flags || []) as string[] };
  return { ok: true, skipped: String(data?.skipped || "nothing"), suggestion: data?.suggestion as OcrSuggestion | undefined };
}

/* The full suggestion for an item (the list leaves it out; it is large). */
export async function loadSuggestion(itemId: string): Promise<OcrSuggestion | null> {
  const { data } = await supabase.from("inventory").select("ocr_suggestion").eq("id", itemId).maybeSingle();
  return (data?.ocr_suggestion as OcrSuggestion | null) || null;
}

export async function applyFields(
  itemId: string,
  fields: Record<string, string>,
  changeBarcode = false,
): Promise<ApplyResult> {
  const { data, error } = await supabase.rpc("inventory_ocr_apply", { p_item_id: itemId, p_fields: fields, p_change_barcode: changeBarcode });
  if (error) throw new Error(error.message || "Could not apply.");
  return data as ApplyResult;
}

export async function undoApply(itemId: string): Promise<{ restored: Record<string, unknown>; kept: Record<string, string> }> {
  const { data, error } = await supabase.rpc("inventory_ocr_undo", { p_item_id: itemId });
  if (error) throw new Error(error.message || "Could not undo.");
  return data as { restored: Record<string, unknown>; kept: Record<string, string> };
}

/* Read the barcode lines of a barcode photo itself - far more reliable than
   reading its digits. Returns a number only if it passes the check digit. */
export async function decodeBarcodePhoto(url: string): Promise<string | null> {
  try {
    const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = await import("@zxing/library");
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("photo"));
      el.src = url;
    });
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.EAN_8, BarcodeFormat.UPC_E]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);
    const result = await reader.decodeFromImageElement(img);
    const text = String(result.getText() || "").replace(/\D/g, "");
    return isBarcodeNumber(text) ? text : null;
  } catch {
    return null;
  }
}

/* What needs a person's look, from what the list already holds. */
export type ReviewKind = "no_barcode" | "unread" | "mismatch" | "ambiguous" | "unreadable";

export function reviewKinds(item: {
  barcode?: string | null; modelId?: string | null; imageUrls?: string[]; ocrReadAt?: string | null; ocrFlags?: string[];
}): ReviewKind[] {
  const out: ReviewKind[] = [];
  const bc = (item.barcode || "").trim();
  if (!bc || (bc === (item.modelId || "").trim() && !isBarcodeNumber(bc))) out.push("no_barcode");
  if ((item.imageUrls?.length || 0) > 0 && !item.ocrReadAt) out.push("unread");
  const f = item.ocrFlags || [];
  if (f.includes("mismatch")) out.push("mismatch");
  if (f.includes("ambiguous_barcode")) out.push("ambiguous");
  if (f.includes("low_confidence") || f.includes("too_large") || f.includes("read_failed")) out.push("unreadable");
  return out;
}

export const REVIEW_LABEL: Record<ReviewKind, string> = {
  no_barcode: "No barcode",
  unread: "Photo not read",
  mismatch: "Label disagrees",
  ambiguous: "Pick the barcode",
  unreadable: "Could not read",
};
