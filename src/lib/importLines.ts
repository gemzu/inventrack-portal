/* Reading invoice lines from a spreadsheet: pasted cells (tab separated, straight from Excel or Sheets) or a CSV
   file. Nothing here touches the database; it turns text into lines and says what it could not use. The limits are
   the same ones the database checks when the order is saved (description 300 characters, part number 60, a whole
   quantity from 1 to 1,000,000, a price that is not negative), so a line that passes here is accepted there. */

export interface ImportLine { description: string; part: string; qty: number; cents: number | null; noDescription: boolean }
export interface ImportProblem { row: number; text: string }
export interface ImportResult {
  lines: ImportLine[];
  problems: ImportProblem[];
  /** How the columns were read, for the preview ("Part #, Qty, Price"). */
  columns: string[];
  headerFound: boolean;
  /** Lines whose part number already appeared above. */
  repeats: number;
  tooMany: boolean;
}

export const MAX_IMPORT = 1000;

type Field = "part" | "description" | "qty" | "price";
const FIELD_NAME: Record<Field, string> = { part: "Part #", description: "Description", qty: "Qty", price: "Price" };
const SYNONYMS: Record<Field, string[]> = {
  part: ["part", "part#", "partno", "partnumber", "partnum", "pn", "sku", "item#", "itemno", "itemnumber", "code", "number", "model", "no"],
  description: ["description", "desc", "item", "itemdescription", "name", "product", "productname", "details"],
  qty: ["qty", "quantity", "qnty", "units", "pcs", "pieces", "count", "amount"],
  price: ["price", "unitprice", "saleprice", "sellprice", "sellingprice", "rate", "each", "cost", "unitcost"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9#]/g, "");

/* Split text into rows of cells. Handles quotes (a quoted cell can hold the separator and doubled quotes). */
export function splitCells(text: string): string[][] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = clean.split("\n").find((l) => l.trim()) || "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const sep = count("\t") > 0 ? "\t" : count(";") > count(",") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') { if (clean[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
}

export function parseQty(s: string): number | null {
  const t = s.toLowerCase().replace(/\b(pcs?|pieces?|units?|ea)\b\.?/g, "").replace(/[,\s]/g, "");
  if (!/^\d+(\.0+)?$/.test(t)) return null;
  const n = parseInt(t, 10);
  return n >= 1 && n <= 1_000_000 ? n : null;
}

/* "12.50", "$1,200.50", "" (no price yet). undefined = not a price. */
export function parsePrice(s: string): number | null | undefined {
  const t = s.replace(/[$\s,]/g, "");
  if (t === "") return null;
  if (!/^\d+(\.\d{1,4})?$/.test(t)) return undefined;
  const c = Math.round(parseFloat(t) * 100);
  return c <= 100_000_000_000 ? c : undefined;
}

/* A line copied the way it is written on paper: "#167 -> Qty 528 Pcs". */
const WRITTEN = /^#?\s*([A-Za-z0-9][A-Za-z0-9\-./]*)\s*(?:->|=>|→|:|-)?\s*(?:qty|quantity)\s*[:=]?\s*([\d,]+)/i;

function detectColumns(rows: string[][]): { map: Partial<Record<Field, number>>; headerFound: boolean; start: number } {
  const head = rows[0].map(norm);
  const map: Partial<Record<Field, number>> = {};
  head.forEach((h, i) => {
    for (const f of Object.keys(SYNONYMS) as Field[]) {
      if (map[f] === undefined && SYNONYMS[f].includes(h)) { map[f] = i; break; }
    }
  });
  // A header row has at least a quantity and one other known column.
  if (map.qty !== undefined && Object.keys(map).length >= 2) return { map, headerFound: true, start: 1 };
  const n = Math.max(...rows.slice(0, 5).map((r) => r.length));
  if (n >= 4) return { map: { part: 0, description: 1, qty: 2, price: 3 }, headerFound: false, start: 0 };
  if (n === 3) return { map: { part: 0, qty: 1, price: 2 }, headerFound: false, start: 0 };
  return { map: { part: 0, qty: 1 }, headerFound: false, start: 0 };
}

export function parseLines(text: string): ImportResult {
  const out: ImportResult = { lines: [], problems: [], columns: [], headerFound: false, repeats: 0, tooMany: false };
  const raw = text.trim();
  if (!raw) return out;

  // Written-out lines ("#167 -> Qty 528 Pcs"), one per line, with no table at all.
  const written = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (written.length && written.every((l) => WRITTEN.test(l))) {
    out.columns = ["Part #", "Qty"];
    const seen = new Set<string>();
    written.forEach((l, i) => {
      const m = l.match(WRITTEN)!;
      const qty = parseQty(m[2]);
      if (qty == null) { out.problems.push({ row: i + 1, text: `Quantity "${m[2]}" is not a whole number from 1 up` }); return; }
      push(out, seen, { description: m[1], part: m[1], qty, cents: null, noDescription: true });
    });
    return out;
  }

  const rows = splitCells(raw);
  if (!rows.length) return out;
  const { map, headerFound, start } = detectColumns(rows);
  out.headerFound = headerFound;
  out.columns = (Object.keys(FIELD_NAME) as Field[]).filter((f) => map[f] !== undefined).map((f) => FIELD_NAME[f]);
  if (map.qty === undefined) {
    out.problems.push({ row: 1, text: "Could not find a quantity column. Name it Qty or Quantity." });
    return out;
  }
  const seen = new Set<string>();
  for (let r = start; r < rows.length; r++) {
    const cells = rows[r];
    const at = (f: Field) => (map[f] === undefined ? "" : cells[map[f]!] ?? "");
    const rowNo = r + 1;
    const part = at("part");
    const descRaw = at("description");
    if (!part && !descRaw) { out.problems.push({ row: rowNo, text: "No part number or description" }); continue; }
    const qty = parseQty(at("qty"));
    if (qty == null) { out.problems.push({ row: rowNo, text: `Quantity "${at("qty")}" is not a whole number from 1 up` }); continue; }
    const cents = parsePrice(at("price"));
    if (cents === undefined) { out.problems.push({ row: rowNo, text: `Price "${at("price")}" is not a number` }); continue; }
    if (part.length > 60) { out.problems.push({ row: rowNo, text: "Part number is longer than 60 characters" }); continue; }
    const description = (descRaw || part).slice(0, 300);
    push(out, seen, { description, part, qty, cents, noDescription: !descRaw });
  }
  return out;
}

function push(out: ImportResult, seen: Set<string>, line: ImportLine) {
  if (out.lines.length >= MAX_IMPORT) { out.tooMany = true; return; }
  const key = line.part.toLowerCase();
  if (key && seen.has(key)) out.repeats += 1;
  if (key) seen.add(key);
  out.lines.push(line);
}

/* One line per part number, quantities added up. The first line's description and price are kept; a later price
   fills in only if the first had none. Lines with no part number stay as they are. */
export function combineRepeats(lines: ImportLine[]): ImportLine[] {
  const byPart = new Map<string, ImportLine>();
  const out: ImportLine[] = [];
  for (const l of lines) {
    const key = l.part.toLowerCase();
    const first = key ? byPart.get(key) : undefined;
    if (first) {
      first.qty = Math.min(1_000_000, first.qty + l.qty);
      if (first.cents == null && l.cents != null) first.cents = l.cents;
    } else {
      const copy = { ...l };
      if (key) byPart.set(key, copy);
      out.push(copy);
    }
  }
  return out;
}
