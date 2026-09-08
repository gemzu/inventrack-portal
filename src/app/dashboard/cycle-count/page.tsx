"use client";

/**
 * Cycle count.
 *
 * Modelled on the app's existing count screen rather than invented: pick a
 * scope (everything, loose stock, or one box), enter what you physically
 * counted per line, and the page reconciles counted against expected.
 *
 * Applying sets each item's quantity to the counted figure straight away, and
 * writes one scan_logs row per adjustment so the change is attributable. Lines
 * left blank are untouched, which is what makes a partial sweep safe: not
 * counting something is different from counting it as zero.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import { itemIdentity } from "@/lib/itemIdentity";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, Chip, Input } from "@/components/console/controls";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getBoxes } from "@/lib/dataService";
import { ClipboardCheck, Loader2, RotateCcw } from "lucide-react";

type Item = {
  id: string;
  barcode: string | null;
  modelId: string | null;
  displayName: string | null;
  quantity: number;
  boxId: string | null;
};

type Box = { id: string; code?: string | null };

export default function CycleCountPage() {
  const { orgId, user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [scope, setScope] = useState<string>("all");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data }, bx] = await Promise.all([
      supabase
        .from("inventory")
        .select("id,barcode,model_id,display_name,quantity,box_id")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(500),
      getBoxes(orgId).catch(() => [] as Box[]),
    ]);
    setItems(
      (data || []).map((r) => ({
        id: r.id as string,
        barcode: (r.barcode as string) ?? null,
        modelId: (r.model_id as string) ?? null,
        displayName: (r.display_name as string) ?? null,
        quantity: (r.quantity as number) ?? 0,
        boxId: (r.box_id as string) ?? null,
      }))
    );
    setBoxes(bx as Box[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const scoped = useMemo(() => {
    if (scope === "all") return items;
    if (scope === "loose") return items.filter((i) => !i.boxId);
    return items.filter((i) => i.boxId === scope);
  }, [items, scope]);

  const stats = useMemo(() => {
    let counted = 0, matched = 0, over = 0, short = 0;
    for (const it of scoped) {
      const c = counts[it.id];
      if (c === undefined) continue;
      counted++;
      if (c === it.quantity) matched++;
      else if (c > it.quantity) over++;
      else short++;
    }
    return { counted, matched, over, short, total: scoped.length, variances: over + short };
  }, [scoped, counts]);

  const setCount = (id: string, raw: string) => {
    if (raw === "") {
      setCounts((c) => { const n = { ...c }; delete n[id]; return n; });
      return;
    }
    const v = Math.max(0, Number(raw.replace(/[^0-9]/g, "")) || 0);
    setCounts((c) => ({ ...c, [id]: v }));
  };

  const apply = async () => {
    const changes = scoped.filter((it) => {
      const c = counts[it.id];
      return c !== undefined && c !== it.quantity;
    });
    if (!changes.length) { toast("Nothing to adjust", "info"); return; }

    setApplying(true);
    try {
      for (const it of changes) {
        const to = counts[it.id];
        await supabase.from("inventory").update({ quantity: to }).eq("id", it.id);
        /* One row per adjustment, so the change is attributable later. A
           failed log must not abort the rest of the count. */
        try {
          await supabase.from("scan_logs").insert({
            org_id: orgId,
            barcode: it.barcode || it.modelId || "",
            action: "count",
            result: to > it.quantity ? "over" : "short",
            note: `Cycle count: ${it.quantity} to ${to}`,
            scanned_by: user?.email ?? null,
          });
        } catch {
          /* ignored on purpose */
        }
      }
      toast(`Adjusted ${changes.length} ${changes.length === 1 ? "item" : "items"}`, "success");
      setCounts({});
      load();
    } catch {
      toast("Could not apply the count", "error");
    } finally {
      setApplying(false);
    }
  };

  const chips = useMemo(
    () => [
      { key: "all", label: "Everything" },
      { key: "loose", label: "Loose stock" },
      ...boxes.map((b) => ({ key: b.id, label: b.code || "Box" })),
    ],
    [boxes]
  );


  return (
    <AdminGuard>
      <PageShell
        title="Cycle count"
        eyebrow="Console"
        subtitle="Count what is physically there, then set the system to match. Lines you leave blank are not touched — not counting something is different from counting it as zero."
        actions={
          <>
            {stats.counted > 0 && (
              <Action onClick={() => setCounts({})}>
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Action>
            )}
            <Action solid onClick={apply} disabled={applying || stats.variances === 0}>
              {applying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ClipboardCheck className="h-3.5 w-3.5" />
              )}
              Adjust {stats.variances > 0 ? stats.variances : ""}
            </Action>
          </>
        }
      >
        <div className="space-y-8">
          {/* What the sweep currently says. Short and over are the two numbers
              that mean something is wrong, so they are the only coloured ones. */}
          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="In scope" value={stats.total} />
            <Figure label="Counted" value={stats.counted} />
            <Figure label="Matching" value={stats.matched} />
            <Figure label="Short" value={stats.short} tone={stats.short ? "warning" : undefined} />
            <Figure label="Over" value={stats.over} tone={stats.over ? "brand" : undefined} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <Chip
                key={c.key}
                on={scope === c.key}
                onClick={() => { setScope(c.key); setCounts({}); }}
              >
                {c.label}
              </Chip>
            ))}
          </div>

          {loading ? (
            <ListSkeleton rows={8} />
          ) : scoped.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nothing in this scope"
              description="Pick another box, or put stock on the floor first."
            />
          ) : (
            <Panel className="reveal">
              <div className="grid grid-cols-[1fr_5rem_7rem_4rem] gap-3 border-b border-border px-5 py-2.5">
                <ColHead>Item</ColHead>
                <ColHead className="text-right">Expected</ColHead>
                <ColHead className="text-right">Counted</ColHead>
                <ColHead className="text-right">Diff</ColHead>
              </div>

              {scoped.map((it) => {
                const id = itemIdentity(it);
                const c = counts[it.id];
                const diff = c === undefined ? null : c - it.quantity;
                return (
                  <div
                    key={it.id}
                    className="row-line grid grid-cols-[1fr_5rem_7rem_4rem] items-center gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${id.unnamed ? "mono" : ""}`}>
                        {id.title}
                      </p>
                      {id.subtitle && (
                        <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {id.subtitle}
                        </p>
                      )}
                    </div>

                    <span className="mono text-right text-sm text-muted-foreground">
                      {it.quantity}
                    </span>

                    <Input
                      inputMode="numeric"
                      value={c ?? ""}
                      onChange={(e) => setCount(it.id, e.target.value)}
                      placeholder="—"
                      aria-label={`Counted quantity for ${id.title}`}
                      className="mono h-8 py-1 text-right"
                    />

                    <span
                      className={`mono text-right text-sm font-semibold tabular-nums ${
                        diff === null || diff === 0
                          ? "text-muted-foreground"
                          : diff < 0
                            ? "text-warning"
                            : "text-[var(--brand-2)]"
                      }`}
                    >
                      {diff === null ? "" : diff > 0 ? `+${diff}` : diff}
                    </span>
                  </div>
                );
              })}
            </Panel>
          )}
        </div>
      </PageShell>
    </AdminGuard>
  );
}
