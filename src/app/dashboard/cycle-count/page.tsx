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
        subtitle="Count what is physically there, then adjust the system to match."
      >
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => { setScope(c.key); setCounts({}); }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.30,1)] ${
                  scope === c.key
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="card-luxury flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
            <Figure label="In scope" value={stats.total} />
            <Figure label="Counted" value={stats.counted} />
            <Figure label="Match" value={stats.matched} />
            <Figure label="Short" value={stats.short} tone={stats.short ? "text-warning" : undefined} />
            <Figure label="Over" value={stats.over} tone={stats.over ? "text-primary" : undefined} />
            <div className="ml-auto flex items-center gap-3">
              {stats.counted > 0 && (
                <button
                  onClick={() => setCounts({})}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear
                </button>
              )}
              <button
                onClick={apply}
                disabled={applying || stats.variances === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.30,1)] hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                Adjust {stats.variances > 0 ? stats.variances : ""}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading stock
            </p>
          ) : scoped.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nothing in this scope"
              description="Pick another box, or add stock first."
            />
          ) : (
            <div className="card-luxury overflow-hidden p-0">
              <div className="grid grid-cols-[1fr_6rem_7rem_5rem] gap-3 border-b border-border px-5 py-2.5 text-xs font-semibold text-muted-foreground">
                <span>Item</span>
                <span className="text-right">Expected</span>
                <span className="text-right">Counted</span>
                <span className="text-right">Diff</span>
              </div>
              {scoped.map((it) => {
                const c = counts[it.id];
                const diff = c === undefined ? null : c - it.quantity;
                return (
                  <div
                    key={it.id}
                    className="grid grid-cols-[1fr_6rem_7rem_5rem] items-center gap-3 border-b border-border/70 px-5 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {it.displayName || it.modelId || it.barcode || "Item"}
                      </p>
                      <p className="mono truncate text-xs text-muted-foreground">{it.barcode || it.modelId}</p>
                    </div>
                    <span className="mono text-right text-sm text-muted-foreground">{it.quantity}</span>
                    <input
                      inputMode="numeric"
                      value={c ?? ""}
                      onChange={(e) => setCount(it.id, e.target.value)}
                      placeholder="—"
                      aria-label={`Counted quantity for ${it.displayName || it.barcode || "item"}`}
                      className="mono w-full rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm outline-none transition-[border-color,box-shadow] duration-200"
                    />
                    <span
                      className={`mono text-right text-sm font-semibold ${
                        diff === null || diff === 0
                          ? "text-muted-foreground"
                          : diff < 0
                            ? "text-warning"
                            : "text-primary"
                      }`}
                    >
                      {diff === null ? "" : diff > 0 ? `+${diff}` : diff}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageShell>
    </AdminGuard>
  );
}

function Figure({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <p className={`mono text-xl font-semibold tabular-nums ${tone || ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
