"use client";

/**
 * A list of barcodes with a rule attached to them.
 *
 * The blacklist and the whitelist were two files saying the same thing in two
 * slightly different ways — one led each row with a red icon tile, the other
 * with a green one, and their add-dialogs disagreed about whether the fields
 * were required. They are the same screen with the polarity flipped, so they
 * are one component now and cannot drift apart again.
 *
 * The code is what people scan and search for, so the code is set in mono at
 * row-title size, and the reason it is on the list is the caption under it.
 */

import { useMemo, useState, type ReactNode } from "react";
import { Plus, Trash2, type LucideIcon } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Panel, Figure, ColHead, ListSkeleton } from "./surfaces";
import { Action, Field, Input, Modal, SearchInput } from "./controls";

export type CodeRow = {
  id: string;
  barcode: string;
  label?: string;
  reason?: string;
  createdAt?: unknown;
};

export default function CodeList({
  rows,
  loading,
  icon,
  figureLabel,
  addTitle,
  addSubtitle,
  emptyTitle,
  emptyDescription,
  searchPlaceholder,
  reasonPlaceholder,
  formatWhen,
  onAdd,
  onRemove,
  note,
}: {
  rows: CodeRow[];
  loading: boolean;
  icon: LucideIcon;
  figureLabel: string;
  addTitle: string;
  addSubtitle: string;
  emptyTitle: string;
  emptyDescription: string;
  searchPlaceholder: string;
  reasonPlaceholder: string;
  formatWhen: (v: unknown) => string;
  onAdd: (v: { barcode: string; label: string; reason: string }) => Promise<void> | void;
  onRemove: (row: CodeRow) => Promise<void> | void;
  /** A line under the figures explaining what the list actually does. */
  note?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ barcode: "", label: "", reason: "" });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) => r.barcode?.toLowerCase().includes(s) || r.label?.toLowerCase().includes(s)
    );
  }, [rows, search]);

  const submit = async () => {
    if (!form.barcode.trim()) return;
    await onAdd({
      barcode: form.barcode.trim(),
      label: form.label.trim(),
      reason: form.reason.trim(),
    });
    setForm({ barcode: "", label: "", reason: "" });
    setOpen(false);
  };

  if (loading) return <ListSkeleton rows={6} />;

  return (
    <>
      <div className="space-y-8">
        <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <Figure label={figureLabel} value={rows.length} />
          {search && <Figure label="Matching" value={filtered.length} tone="brand" />}
          <div className="ml-auto">
            <Action solid onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add code
            </Action>
          </div>
        </div>

        {note && <p className="reveal d1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{note}</p>}

        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder={searchPlaceholder}
          aria-label="Search codes"
        />

        {filtered.length === 0 ? (
          <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
        ) : (
          <Panel className="reveal">
            <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
              <ColHead className="min-w-0 flex-1">Code</ColHead>
              <ColHead className="w-40 shrink-0">Added</ColHead>
              <span className="w-8 shrink-0" />
            </div>

            {filtered.map((r) => (
              <div key={r.id} className="row-line group flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="mono truncate text-sm font-medium">{r.barcode}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {r.label || "No label"}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                </div>
                <span className="mono hidden w-40 shrink-0 text-[11px] text-muted-foreground sm:block">
                  {r.createdAt ? formatWhen(r.createdAt) : ""}
                </span>
                <button
                  onClick={() => onRemove(r)}
                  aria-label={`Remove ${r.barcode}`}
                  className="w-8 shrink-0 text-muted-foreground opacity-0 transition-[opacity,color] duration-300 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </Panel>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={addTitle} subtitle={addSubtitle}>
        <div className="space-y-5">
          <Field label="Barcode">
            <Input
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Scan or type the code"
              autoFocus
            />
          </Field>
          <Field label="Label" hint="What the code is, for whoever reads this later.">
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Optional"
            />
          </Field>
          <Field label="Reason">
            <Input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder={reasonPlaceholder}
            />
          </Field>
          <div className="flex gap-3">
            <Action onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Action>
            <Action solid onClick={submit} disabled={!form.barcode.trim()} className="flex-1">
              Add code
            </Action>
          </div>
        </div>
      </Modal>
    </>
  );
}
