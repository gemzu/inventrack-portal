"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { RefreshCw } from "lucide-react";
import PageShell from "@/components/page-shell";
import { Panel, Rule, Figure, ListSkeleton } from "@/components/console/surfaces";
import { Action, SearchInput, Select } from "@/components/console/controls";
import { useToast } from "@/components/Toast";
import Link from "next/link";

interface EnrichmentStats {
  totalProducts: number;
  enrichedCount: number;
  pendingCount: number;
  verifiedCount: number;
  avgConfidence: number;
  queueCount: number;
}

interface EnrichmentQueueItem {
  id: string;
  modelId: string;
  nameHint?: string;
  status: string;
  priority: number;
  createdAt: string;
  attempts: number;
}

interface GlobalProduct {
  id: string;
  modelId: string;
  name: string;
  brand?: string;
  category?: string;
  enrichmentStatus: string;
  verificationStatus: string;
  enrichmentConfidence: number;
  enrichedAt?: string;
}

export default function EnrichmentDashboardPage() {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [queue, setQueue] = useState<EnrichmentQueueItem[]>([]);
  const [products, setProducts] = useState<GlobalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // Get enrichment stats
      const { data: statsData } = await supabase
        .from("enrichment_dashboard")
        .select("*")
        .eq("org_id", orgId)
        .single();

      if (statsData) {
        setStats({
          totalProducts: statsData.total_products || 0,
          enrichedCount: statsData.enriched_count || 0,
          pendingCount: statsData.pending_count || 0,
          verifiedCount: statsData.verified_count || 0,
          avgConfidence: statsData.avg_confidence || 0,
          queueCount: statsData.queue_count || 0,
        });
      }

      // Get queue
      const { data: queueData } = await supabase
        .from("enrichment_queue")
        .select("*")
        .eq("org_id", orgId)
        .eq("status", "queued")
        .order("priority", { ascending: true })
        .limit(10);

      setQueue((queueData || []).map(q => ({
        id: q.id,
        modelId: q.model_id,
        nameHint: q.name_hint,
        status: q.status,
        priority: q.priority,
        createdAt: q.created_at,
        attempts: q.attempts,
      })));

      // Get products needing verification
      const { data: productsData } = await supabase
        .from("global_products")
        .select("*")
        .eq("org_id", orgId)
        .eq("enrichment_status", "completed")
        .eq("verification_status", "unverified")
        .order("enriched_at", { ascending: false })
        .limit(20);

      setProducts((productsData || []).map(p => ({
        id: p.id,
        modelId: p.model_id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        enrichmentStatus: p.enrichment_status,
        verificationStatus: p.verification_status,
        enrichmentConfidence: p.enrichment_confidence || 0,
        enrichedAt: p.enriched_at,
      })));

    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function processQueue() {
    setProcessing(true);
    try {
      // Call the RPC function to process queue
      const { data, error } = await supabase.rpc("process_enrichment_queue", {
        p_org_id: orgId,
        p_limit: 5,
      });

      if (error) throw error;

      toast(`Processed ${data?.processed || 0} items from queue`, "success");
      loadData();
    } catch {
      toast("Failed to process queue", "error");
    } finally {
      setProcessing(false);
    }
  }

  const filteredProducts = products.filter(p => {
    if (filter === "high-confidence") return p.enrichmentConfidence >= 0.8;
    if (filter === "needs-review") return p.enrichmentConfidence < 0.5;
    return true;
  }).filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.modelId?.toLowerCase().includes(s) ||
           p.name?.toLowerCase().includes(s) ||
           p.brand?.toLowerCase().includes(s);
  });

  if (loading) {
    return (
      <PageShell title="Enrichment" subtitle="Reading the queue." eyebrow="Console">
        <ListSkeleton rows={6} />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Enrichment"
      eyebrow="Console"
      subtitle="Product detail filled in automatically, and the queue of guesses still waiting on a human."
      actions={
        <Action onClick={loadData}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Action>
      }
    >
      <div className="space-y-12">
        <section className="space-y-5">
          <Rule label="Where it stands" />
          <div className="reveal grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-4">
            <div className="bg-background p-5">
              <Figure label="Products" value={stats?.totalProducts || 0} />
            </div>
            <div className="bg-background p-5">
              <Figure
                label="Filled in"
                value={stats?.enrichedCount || 0}
                note={
                  stats?.avgConfidence
                    ? `${Math.round(stats.avgConfidence * 100)}% average confidence`
                    : undefined
                }
              />
            </div>
            <div className="bg-background p-5">
              <Figure label="Checked by a person" value={stats?.verifiedCount || 0} />
            </div>
            <div className="bg-background p-5">
              <Figure
                label="Queued"
                value={stats?.queueCount || 0}
                tone={(stats?.queueCount ?? 0) > 0 ? "warning" : undefined}
              />
              {(stats?.queueCount ?? 0) > 0 && (
                <button
                  onClick={processQueue}
                  disabled={processing}
                  className="mono mt-3 text-[11px] uppercase tracking-[0.16em] text-[var(--brand-2)] transition-colors duration-300 hover:text-foreground disabled:opacity-40"
                >
                  {processing ? "Processing" : "Process now"}
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* ── Queue ────────────────────────────────────────── */}
          <section className="space-y-5 lg:col-span-1">
            <Rule label="Waiting" />
            {queue.length === 0 ? (
              <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Queue is empty
              </p>
            ) : (
              <Panel className="reveal max-h-96 overflow-y-auto">
                {queue.map((item) => (
                  <div key={item.id} className="row-line px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="mono truncate text-sm font-medium">{item.modelId}</span>
                      <span className="mono shrink-0 text-[11px] text-warning">
                        {item.priority}
                      </span>
                    </div>
                    <p className="mono mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {item.nameHint ? `${item.nameHint} · ` : ""}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </Panel>
            )}
          </section>

          {/* ── Needs a human ────────────────────────────────── */}
          <section className="space-y-5 lg:col-span-2">
            <Rule
              label="Needs checking"
              action={
                <span className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {filteredProducts.length}
                </span>
              }
            />

            <div className="flex flex-wrap gap-3">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                placeholder="Name, model, or brand"
                aria-label="Search products needing verification"
                className="min-w-[14rem] flex-1"
              />
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter by confidence"
                className="w-48"
              >
                <option value="all">Any confidence</option>
                <option value="high-confidence">Confident</option>
                <option value="needs-review">Unsure</option>
              </Select>
            </div>

            {filteredProducts.length === 0 ? (
              <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Nothing waiting on a person
              </p>
            ) : (
              <Panel className="reveal max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/dashboard/products/${product.id}/verify`}
                    className="row-line group flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {product.modelId}
                        {product.brand ? ` · ${product.brand}` : ""}
                        {product.category ? ` · ${product.category}` : ""}
                      </p>
                    </div>
                    {/* Confidence is a number, so it is printed as one. */}
                    <span
                      className={`mono shrink-0 text-sm font-semibold tabular-nums ${
                        product.enrichmentConfidence >= 0.8
                          ? "text-success"
                          : product.enrichmentConfidence >= 0.5
                            ? "text-warning"
                            : "text-destructive"
                      }`}
                    >
                      {Math.round(product.enrichmentConfidence * 100)}%
                    </span>
                    <span className="mono shrink-0 text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors duration-300 group-hover:text-[var(--brand-2)]">
                      Check
                    </span>
                  </Link>
                ))}
              </Panel>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
