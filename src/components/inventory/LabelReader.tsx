"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Lock, ScanText, Undo2, AlertTriangle, Check } from "lucide-react";
import {
  OcrSuggestion, applyFields, decodeBarcodePhoto, isBarcodeNumber, loadSuggestion, readItemPhoto, sameBarcode, undoApply,
} from "@/lib/labelRead";
import { Field } from "@/components/console/controls";

type ReaderItem = {
  id: string;
  barcode?: string | null;
  barcodeSource?: string | null;
  displayName?: string | null;
  brand?: string | null;
  partNumber?: string | null;
  labelText?: string | null;
  imageUrls?: string[];
  photoTypes?: Record<string, string>;
  ocrReadAt?: string | null;
  ocrFlags?: string[];
  ocrLastApply?: { at?: string; after?: Record<string, unknown> } | null;
};

type Props = {
  item: ReaderItem;
  onApplied: (applied: Record<string, string | null>) => void;
  onUndone: (restored: Record<string, unknown>) => void;
  onRead: (readAt: string, flags: string[]) => void;
  toast: (message: string, kind?: "success" | "error") => void;
};

type RowKey = "display_name" | "brand" | "part_number" | "label_text" | "barcode";
const LABEL: Record<RowKey, string> = {
  display_name: "Name", brand: "Make", part_number: "Model / part number", label_text: "Label text", barcode: "Barcode",
};

export default function LabelReader({ item, onApplied, onUndone, onRead, toast }: Props) {
  const [sug, setSug] = useState<OcrSuggestion | null>(null);
  const [reading, setReading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [edits, setEdits] = useState<Partial<Record<RowKey, string>>>({});
  const [picked, setPicked] = useState<Partial<Record<RowKey, boolean>>>({});
  const [replaceBarcode, setReplaceBarcode] = useState(false);
  const [decoded, setDecoded] = useState<string | null>(null);
  const [menu, setMenu] = useState<number | null>(null);

  const photos = useMemo(() => item.imageUrls || [], [item.imageUrls]);
  const barcodePhotos = useMemo(() => photos.filter((u) => item.photoTypes?.[u] === "upc"), [photos, item.photoTypes]);
  const hasBarcode = !!(item.barcode || "").trim();

  // What is waiting on the item (the parent keys this component by item, so
  // each item starts clean).
  useEffect(() => {
    let live = true;
    if (item.ocrReadAt) {
      loadSuggestion(item.id).then((s) => { if (live && s) setSug(s); });
    }
    return () => { live = false; };
  }, [item.id, item.ocrReadAt]);

  // A barcode photo: read its lines (not its digits) when the item has no barcode.
  useEffect(() => {
    let live = true;
    if (hasBarcode || !barcodePhotos.length) return;
    (async () => {
      for (const u of barcodePhotos) {
        const code = await decodeBarcodePhoto(u);
        if (code && live) { setDecoded(code); return; }
      }
    })();
    return () => { live = false; };
  }, [item.id, hasBarcode, barcodePhotos]);

  // The values the person would apply: the reader's, then any they picked off the photo.
  const proposed = useMemo(() => {
    const f = sug?.fields;
    const barcode = edits.barcode ?? (f?.barcode || decoded || "");
    return {
      display_name: edits.display_name ?? f?.display_name ?? "",
      brand: edits.brand ?? f?.brand ?? "",
      part_number: edits.part_number ?? f?.part_number ?? "",
      label_text: edits.label_text ?? sug?.text ?? "",
      barcode: barcode || "",
    } as Record<RowKey, string>;
  }, [sug, edits, decoded]);

  const current: Record<RowKey, string> = {
    display_name: item.displayName || "", brand: item.brand || "", part_number: item.partNumber || "",
    label_text: item.labelText || "", barcode: item.barcode || "",
  };

  // Default ticks: fill what is empty; never overwrite what is there unless ticked.
  const isOn = (k: RowKey) => {
    if (k === "barcode") return picked.barcode ?? (!hasBarcode && isBarcodeNumber(proposed.barcode));
    return picked[k] ?? (!current[k] && !!proposed[k]);
  };
  const changed = (k: RowKey) => !!proposed[k] && proposed[k] !== current[k] && !(k === "barcode" && sameBarcode(proposed[k], current[k]));
  const rows = (Object.keys(LABEL) as RowKey[]).filter((k) => changed(k));

  const read = useCallback(async (force: boolean) => {
    setReading(true); setNote(null);
    try {
      const r = await readItemPhoto(item.id, { force });
      if (!r.ok) { setNote(r.message); return; }
      if (r.skipped !== undefined) {
        if (r.skipped === "no_photo") setNote("This item has no photo to read.");
        else if (r.suggestion) setSug(r.suggestion);
        else setNote("Nothing to read here.");
        return;
      }
      setSug(r.suggestion); setEdits({}); setPicked({}); setReplaceBarcode(false);
      onRead(r.suggestion.read_at, r.flags);
    } finally { setReading(false); }
  }, [item.id, onRead]);

  const apply = async () => {
    const fields: Record<string, string> = {};
    for (const k of rows) if (isOn(k)) fields[k] = proposed[k];
    if (!Object.keys(fields).length) { setNote("Tick what to apply."); return; }
    setApplying(true); setNote(null);
    try {
      const r = await applyFields(item.id, fields, replaceBarcode);
      const got = Object.keys(r.applied || {});
      if (got.length) { onApplied(r.applied); toast(`Applied: ${got.map((k) => LABEL[k as RowKey]?.toLowerCase() || k).join(", ")}`, "success"); }
      const why = Object.entries(r.skipped || {}).map(([k, v]) =>
        k === "barcode" ? (v === "locked" ? "The barcode was scanned, so it was left alone." : v === "in_use" ? "That barcode is already on another line." : "That number is not a valid barcode.") : "");
      if (why.filter(Boolean).length) setNote(why.filter(Boolean).join(" "));
      else if (!got.length) setNote("Nothing needed changing.");
      setPicked({}); setReplaceBarcode(false);
    } catch (e) { setNote((e as Error).message); }
    finally { setApplying(false); }
  };

  // Just the barcode read from a barcode photo (no label reading needed).
  const useDecoded = async () => {
    if (!decoded) return;
    setApplying(true); setNote(null);
    try {
      const r = await applyFields(item.id, { barcode: decoded });
      if (Object.keys(r.applied || {}).length) { onApplied(r.applied); toast("Barcode applied", "success"); }
      else setNote(r.skipped?.barcode === "in_use" ? "That barcode is already on another line." : "Nothing needed changing.");
    } catch (e) { setNote((e as Error).message); }
    finally { setApplying(false); }
  };

  const undo = async () => {
    setApplying(true); setNote(null);
    try {
      const r = await undoApply(item.id);
      onUndone(r.restored || {});
      const kept = Object.keys(r.kept || {});
      toast(kept.length ? "Undone, except what was edited since" : "Undone", "success");
    } catch (e) { setNote((e as Error).message); }
    finally { setApplying(false); }
  };

  const assign = (box: number, as: "part_number" | "barcode") => {
    const t = sug?.boxes[box]?.t || "";
    if (as === "barcode") setEdits((e) => ({ ...e, barcode: t.replace(/\D/g, "") }));
    else setEdits((e) => ({ ...e, part_number: t }));
    setPicked((p) => ({ ...p, [as]: true }));
    setMenu(null);
  };

  if (!photos.length) return null;

  const when = sug?.read_at ? new Date(sug.read_at).toLocaleString() : null;
  const barcodeIsValid = isBarcodeNumber;

  return (
    <Field label="Label reading">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => read(!!sug)}
            disabled={reading}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[12px] transition-colors duration-300 hover:border-[var(--brand-2)] disabled:opacity-50"
          >
            {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanText className="h-3.5 w-3.5" />}
            {sug ? "Read the photo again" : "Read from photo"}
          </button>
          {item.ocrLastApply && (
            <button
              type="button"
              onClick={undo}
              disabled={applying}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors duration-300 hover:border-[var(--brand-2)] hover:text-foreground disabled:opacity-50"
            >
              <Undo2 className="h-3.5 w-3.5" /> Undo last apply
            </button>
          )}
          {when && <span className="mono text-[11px] text-muted-foreground">Read {when}{sug?.via === "rules+ai" ? " · with AI help" : ""}</span>}
        </div>

        {decoded && !hasBarcode && !sug && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
            <span className="text-[12px] text-muted-foreground">Read from the barcode photo</span>
            <span className="mono text-sm">{decoded}</span>
            <button
              type="button"
              onClick={useDecoded}
              disabled={applying}
              className="rounded-md bg-primary px-3 py-1 text-[12px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              Use as barcode
            </button>
          </div>
        )}

        {!sug && !reading && !item.ocrReadAt && (
          <p className="text-[12px] text-muted-foreground">
            Reads the text on the photo and offers the name, make, model and label. Nothing changes until you press Apply.
          </p>
        )}
        {item.ocrFlags?.includes("too_large") && !sug && (
          <p className="text-[12px] text-muted-foreground">The photo was too large for the reader. Press Read from photo to shrink and send it.</p>
        )}

        {sug && (
          <>
            {sug.conflicts.length > 0 && (
              <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2">
                {sug.conflicts.map((c, i) => (
                  <p key={i} className="flex items-start gap-2 text-[12px]">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {c.detail}
                  </p>
                ))}
                <p className="text-[11px] text-muted-foreground">Check that this photo is of the right item before applying.</p>
              </div>
            )}

            {/* The photo, with the numbers the reader found: tap one to use it. */}
            {sug.image && sug.boxes.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">Tap a number on the photo to use it as the part number or the barcode.</p>
                <div className="relative inline-block max-w-full overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sug.photo} alt="" className="block max-h-72 w-auto max-w-full" crossOrigin="anonymous" />
                  {sug.boxes.map((b, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMenu(menu === i ? null : i)}
                      title={b.t}
                      className="absolute rounded-sm border border-[var(--brand-2)] bg-[color-mix(in_oklab,var(--brand-2)_18%,transparent)] hover:bg-[color-mix(in_oklab,var(--brand-2)_35%,transparent)]"
                      style={{
                        left: `${(b.l / sug.image!.w) * 100}%`, top: `${(b.tp / sug.image!.h) * 100}%`,
                        width: `${(b.w / sug.image!.w) * 100}%`, height: `${(b.h / sug.image!.h) * 100}%`,
                      }}
                    />
                  ))}
                  {menu !== null && sug.boxes[menu] && (
                    <div
                      className="absolute z-10 w-52 rounded-md border border-border bg-background p-2 shadow-lg"
                      style={{ left: `${Math.min(60, (sug.boxes[menu].l / sug.image.w) * 100)}%`, top: `${Math.min(70, ((sug.boxes[menu].tp + sug.boxes[menu].h) / sug.image.h) * 100)}%` }}
                    >
                      <p className="mono mb-1 truncate text-[12px]">{sug.boxes[menu].t}</p>
                      <button type="button" onClick={() => assign(menu, "part_number")} className="block w-full rounded px-2 py-1 text-left text-[12px] hover:bg-muted">Use as part number</button>
                      {barcodeIsValid(sug.boxes[menu].t.replace(/\D/g, "")) && (
                        <button type="button" onClick={() => assign(menu, "barcode")} className="block w-full rounded px-2 py-1 text-left text-[12px] hover:bg-muted">Use as barcode</button>
                      )}
                      <button type="button" onClick={() => setMenu(null)} className="block w-full rounded px-2 py-1 text-left text-[12px] text-muted-foreground hover:bg-muted">Ignore</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* More than one real barcode on the label: the person chooses. */}
            {!hasBarcode && sug.fields.barcode_candidates.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-muted-foreground">More than one barcode is printed:</span>
                {sug.fields.barcode_candidates.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setEdits((e) => ({ ...e, barcode: c })); setPicked((p) => ({ ...p, barcode: true })); }}
                    className={`mono rounded-md border px-2 py-1 text-[12px] ${proposed.barcode === c ? "border-[var(--brand-2)]" : "border-border"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {decoded && !hasBarcode && !sug.fields.barcode && (
              <p className="text-[12px] text-muted-foreground">Read from the barcode photo: <span className="mono">{decoded}</span></p>
            )}

            {rows.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">Nothing new on this photo: the item already has what it shows.</p>
            ) : (
              <div className="divide-y divide-border rounded-md border border-border">
                {rows.map((k) => (
                  <div key={k} className="px-3 py-2">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isOn(k)}
                        onChange={(e) => setPicked((p) => ({ ...p, [k]: e.target.checked }))}
                        className="mt-1 h-3.5 w-3.5 accent-[var(--brand-2)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] text-muted-foreground">{LABEL[k]}</span>
                        {k === "label_text" ? (
                          <span className="mono block max-h-24 overflow-auto whitespace-pre-wrap text-[12px]">{proposed[k]}</span>
                        ) : (
                          <span className="block break-words text-sm">
                            {current[k] && <span className="mr-2 text-muted-foreground line-through">{current[k]}</span>}
                            <span className={k === "barcode" || k === "part_number" ? "mono" : ""}>{proposed[k]}</span>
                          </span>
                        )}
                      </span>
                    </label>
                    {k === "barcode" && hasBarcode && (
                      <label className="ml-6 mt-2 flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        <input type="checkbox" checked={replaceBarcode} onChange={(e) => { setReplaceBarcode(e.target.checked); if (e.target.checked) setPicked((p) => ({ ...p, barcode: true })); }} className="h-3.5 w-3.5 accent-[var(--brand-2)]" />
                        The scanned barcode is locked. Tick to replace it anyway.
                      </label>
                    )}
                    {k === "barcode" && !barcodeIsValid(proposed.barcode) && (
                      <p className="ml-6 mt-1 text-[11px] text-amber-500">This number does not pass the barcode check; it will not be applied.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {rows.length > 0 && (
              <button
                type="button"
                onClick={apply}
                disabled={applying}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-colors duration-300 hover:bg-primary-dark disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Apply ticked
              </button>
            )}
          </>
        )}

        {note && <p className="text-[12px] text-amber-500">{note}</p>}
      </div>
    </Field>
  );
}
