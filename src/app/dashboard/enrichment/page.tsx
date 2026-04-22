"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  Sparkles, CheckCircle, AlertCircle, Clock, 
  Search, RefreshCw, ExternalLink,
  BrainCircuit, Database, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  function getConfidenceColor(confidence: number) {
    if (confidence >= 0.8) return "text-green-500 bg-green-50";
    if (confidence >= 0.5) return "text-amber-500 bg-amber-50";
    return "text-red-500 bg-red-50";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-page-enter space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Enrichment
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage AI-enriched product data and verification queue
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Database className="w-4 h-4" /> Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" /> AI Enriched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.enrichedCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.avgConfidence ? `${Math.round(stats.avgConfidence * 100)}% avg confidence` : "No data"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" /> Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.verifiedCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-amber-500">{stats?.queueCount || 0}</div>
            {(stats?.queueCount ?? 0) > 0 && (
              <Button 
                onClick={processQueue} 
                disabled={processing}
                size="sm"
              >
                {processing ? "Processing..." : "Process"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" /> Enrichment Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">Queue is empty</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {queue.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">{item.modelId}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        #{item.priority}
                      </span>
                    </div>
                    {item.nameHint && (
                      <p className="text-xs text-muted-foreground mt-1">{item.nameHint}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Queued {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Needs Verification
                <span className="text-sm font-normal text-muted-foreground">
                  ({filteredProducts.length})
                </span>
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm rounded-md border bg-background"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="text-sm rounded-md border bg-background px-3 py-1.5"
                >
                  <option value="all">All</option>
                  <option value="high-confidence">High Confidence</option>
                  <option value="needs-review">Needs Review</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">All products verified!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-primary transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{product.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(product.enrichmentConfidence)}`}>
                          {Math.round(product.enrichmentConfidence * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {product.modelId} {product.brand && `• ${product.brand}`} {product.category && `• ${product.category}`}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/products/${product.id}/verify`}
                      className="ml-4 flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                    >
                      Review <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
