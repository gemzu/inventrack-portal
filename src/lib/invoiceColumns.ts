/* The optional Date and Activity columns on an invoice (a per-company setting, off by default).
   Kept in a file of its own, with no imports, so the rules can be tested directly (scripts/tests/invoice-columns.test.mts
   in the app repo). Invoice lines carry no date or activity of their own, so:
     Date     = the invoice's ship date, or its issue date when there is none
     Activity = the line's part number and brand */

export const lineDate = (inv: { ship_date?: string | null; issued_on: string }) => inv.ship_date || inv.issued_on;

/** 10/24/2026 - short enough for a narrow column. Empty for anything that is not a date. */
export const fmtShortDate = (iso: string | null | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[2]}/${m[3]}/${m[1]}` : "";
};

/** Breaks any unbroken run longer than n characters into lines of n, so a long part number stays inside its column. */
export const breakLong = (s: string, n: number) =>
  s.split(/(\s+)/).map((w) => (w.length > n && !/\s/.test(w) ? (w.match(new RegExp(`.{1,${n}}`, "g")) || [w]).join("\n") : w)).join("");

/** What goes in the Activity cell, one entry per line: the part number first, then the brand. */
export const activityLines = (l: { part_number: string | null; brand: string | null }) =>
  [(l.part_number || "").trim(), (l.brand || "").trim()].filter(Boolean);
