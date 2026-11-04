"use client";

/**
 * "Import from a spreadsheet" for the lines of an invoice or sales order: paste cells straight from Excel or
 * Sheets, or choose a CSV file. Shows what it understood and what it could not use BEFORE anything is added, so
 * nothing is saved by surprise. Adding only puts the lines on the page; the page's own autosave does the rest.
 */

import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Action, Modal, Textarea } from "@/components/console/controls";
import { combineRepeats, parseLines, type ImportLine } from "@/lib/importLines";
import { fmtMoney } from "@/lib/sales";

export default function ImportLinesButton({ onImport, disabled }: { onImport: (lines: ImportLine[]) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [combine, setCombine] = useState(false);
  const [fileName, setFileName] = useState("");
  const pick = useRef<HTMLInputElement>(null);

  const res = useMemo(() => parseLines(text), [text]);
  const lines = useMemo(() => (combine ? combineRepeats(res.lines) : res.lines), [res.lines, combine]);
  const units = lines.reduce((n, l) => n + l.qty, 0);
  const noPrice = lines.filter((l) => l.cents == null).length;
  const noDesc = lines.filter((l) => l.noDescription).length;

  const close = () => { setOpen(false); setText(""); setFileName(""); setCombine(false); };
  const readFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setText(""); setFileName("That file is over 2 MB"); return; }
    setFileName(f.name);
    setText(await f.text());
  };
  const add = () => { if (!lines.length) return; onImport(lines); close(); };

  return (
    <>
      <Action onClick={() => setOpen(true)} disabled={disabled} title="Add many items at once from a spreadsheet">
        <FileSpreadsheet className="h-3.5 w-3.5" /> Import from spreadsheet
      </Action>
      <Modal open={open} onClose={close} title="Import items from a spreadsheet"
        subtitle="Paste the cells from Excel or Google Sheets, or choose a CSV file. Check the preview, then add.">
        <div className="space-y-4">
          <Textarea rows={6} value={text} onChange={(e) => { setText(e.target.value); setFileName(""); }} aria-label="Spreadsheet cells"
            placeholder={"Part #\tQty\tPrice\n167\t528\t1.25\n133\t226\t0.80"} className="mono text-[12px]" />
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            <input ref={pick} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden"
              onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ""; }} />
            <Action onClick={() => pick.current?.click()}>Choose a CSV file</Action>
            <span>{fileName || "Columns it understands: Part #, Description, Qty, Price. Only Qty is required. With no header: Part # then Qty."}</span>
          </div>

          {text.trim() ? (
            <div className="space-y-3 rounded-md border border-border p-3 text-sm">
              {res.columns.length ? (
                <p className="text-[12px] text-muted-foreground">
                  Read as: <span className="font-semibold text-foreground">{res.columns.join(" · ")}</span>
                  {res.headerFound ? " (from your header row)" : " (no header row, so by position)"}
                </p>
              ) : null}
              <p>
                <span className="mono font-semibold">{lines.length}</span> item{lines.length === 1 ? "" : "s"} ·{" "}
                <span className="mono font-semibold">{units.toLocaleString()}</span> units
                {noPrice ? <span className="ml-2 font-semibold text-amber-700 dark:text-amber-300">{noPrice} without a price (type them on the invoice)</span> : null}
              </p>
              {noDesc ? <p className="text-[12px] text-muted-foreground">{noDesc} without a description: the part number is used until you change it.</p> : null}
              {res.repeats > 0 ? (
                <label className="flex cursor-pointer items-start gap-2 text-[13px]">
                  <input type="checkbox" checked={combine} onChange={(e) => setCombine(e.target.checked)} className="mt-1" />
                  <span>{res.repeats} repeated part number{res.repeats === 1 ? "" : "s"}. Add up the quantities into one line each.
                    <span className="block text-[12px] text-muted-foreground">Off: every row stays its own line, as on your sheet.</span></span>
                </label>
              ) : null}
              {res.tooMany ? <p className="text-[13px] text-amber-800 dark:text-amber-200">Only the first 1,000 rows are used. Import the rest in a second go.</p> : null}
              {res.problems.length ? (
                <div className="rounded-md bg-destructive/10 p-2 text-[12px] text-destructive">
                  <p className="font-semibold">{res.problems.length} row{res.problems.length === 1 ? "" : "s"} left out:</p>
                  <ul className="mt-1 space-y-0.5">
                    {res.problems.slice(0, 6).map((p) => <li key={p.row}>Row {p.row}: {p.text}</li>)}
                    {res.problems.length > 6 ? <li>and {res.problems.length - 6} more</li> : null}
                  </ul>
                </div>
              ) : null}
              {lines.length ? (
                <div className="max-h-44 overflow-auto rounded-md border border-border">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-card text-left text-muted-foreground">
                      <tr><th className="px-2 py-1 font-medium">Part #</th><th className="px-2 py-1 font-medium">Description</th><th className="px-2 py-1 text-right font-medium">Qty</th><th className="px-2 py-1 text-right font-medium">Price</th></tr>
                    </thead>
                    <tbody>
                      {lines.slice(0, 30).map((l, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="mono px-2 py-1">{l.part}</td>
                          <td className="max-w-[16rem] truncate px-2 py-1">{l.description}</td>
                          <td className="mono px-2 py-1 text-right">{l.qty}</td>
                          <td className="mono px-2 py-1 text-right">{l.cents == null ? <span className="text-amber-700 dark:text-amber-300">none</span> : fmtMoney(l.cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {lines.length > 30 ? <p className="px-2 py-1 text-[11px] text-muted-foreground">Showing the first 30 of {lines.length}.</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Action onClick={close}>Cancel</Action>
          <Action solid onClick={add} disabled={!lines.length}>Add {lines.length || ""} item{lines.length === 1 ? "" : "s"}</Action>
        </div>
      </Modal>
    </>
  );
}
