"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { connectToStorefront, getStorefrontByCode, getMyStorefronts } from "@/lib/dataService";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import {
  Store, Package, MessageSquare, CheckCircle2,
  ArrowRight, Sparkles, Search, ArrowLeft, Loader2,
} from "lucide-react";

interface ConnectedStorefront {
  storefront?: {
    id: string;
    name?: string;
    orgId?: string;
    inviteCode?: string;
  };
}

interface StorefrontPreview {
  id?: string;
  name?: string;
  description?: string;
  inviteCode?: string;
}

export default function ConnectStorefrontPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<StorefrontPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [chattingId, setChattingId] = useState<string | null>(null);
  const [connectedStorefronts, setConnectedStorefronts] = useState<ConnectedStorefront[]>([]);
  const [activeTab, setActiveTab] = useState<"connected" | "connect">("connected");

  useEffect(() => {
    if (!user) return;
    getMyStorefronts(user.id)
      .then((sf) => setConnectedStorefronts(sf as ConnectedStorefront[]))
      .catch(() => {});
  }, [user]);

  const handleLookup = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setPreview(null);
    try {
      const sf = await getStorefrontByCode(code.trim());
      setPreview(sf as StorefrontPreview);
      if (!sf) toast("No storefront found with that code", "error");
    } catch (e) {
      toast((e as Error).message || "Failed to find storefront", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user || !preview?.id) return;
    setConnecting(true);
    try {
      await connectToStorefront(user.id, String(preview.id));
      toast("Connected! You can now browse their catalog.", "success");
      const updated = await getMyStorefronts(user.id);
      setConnectedStorefronts(updated as ConnectedStorefront[]);
      router.push("/buyer/catalog");
    } catch (e) {
      toast((e as Error).message || "Failed to connect", "error");
    } finally {
      setConnecting(false);
    }
  };

  // Find the admin of a storefront's org and navigate to a direct chat
  const handleChat = async (sf: ConnectedStorefront["storefront"]) => {
    if (!sf?.orgId) { toast("Storefront org not found", "error"); return; }
    setChattingId(sf.id);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("org_id", sf.orgId)
        .in("role", ["admin", "owner"])
        .limit(1)
        .single();
      if (error || !data) throw new Error("No admin found for this storefront");
      router.push(`/buyer/messages?peer=${data.id}&org=${sf.orgId}`);
    } catch (e) {
      toast((e as Error).message || "Could not find admin", "error");
    } finally {
      setChattingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      {/* Hero */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link
            href="/buyer/catalog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to catalog
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Store className="w-5 h-5 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Storefronts</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">
            Connect to storefronts and browse their inventory
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab("connected")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                activeTab === "connected"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/40"
              }`}
            >
              <Store className="w-4 h-4" />
              Connected ({connectedStorefronts.length})
            </button>
            <button
              onClick={() => setActiveTab("connect")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                activeTab === "connect"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/40"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Add new
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === "connected" ? (
          <div className="space-y-3">
            {connectedStorefronts.length === 0 ? (
              <div className="card-luxury p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
                  <Store className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No storefronts yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                  Connect to a storefront using an invite code to browse their products.
                </p>
                <button
                  onClick={() => setActiveTab("connect")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="w-4 h-4" />
                  Connect a storefront
                </button>
              </div>
            ) : (
              <>
                {connectedStorefronts.map((sf) => {
                  const s = sf.storefront;
                  const isChattingThis = chattingId === s?.id;
                  return (
                    <div key={s?.id} className="card-luxury p-5 hover:border-foreground/20 transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                          <Store className="w-6 h-6 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">
                              {s?.name || "Storefront"}
                            </h3>
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 border border-success/30 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Connected
                            </span>
                          </div>
                          {s?.inviteCode && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {s.inviteCode}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleChat(s)}
                            disabled={isChattingThis}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:border-foreground hover:bg-secondary transition-all disabled:opacity-50"
                          >
                            {isChattingThis
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <MessageSquare className="w-3.5 h-3.5" />
                            }
                            Chat
                          </button>
                          <Link
                            href="/buyer/catalog"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Browse
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-2">
                  <button
                    onClick={() => setActiveTab("connect")}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Connect another storefront
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="card-luxury p-6 max-w-lg">
            <h2 className="font-semibold text-foreground mb-1">Enter invite code</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Ask the storefront owner for their invite code, then paste it below.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="e.g. STORE-XXXX"
                  className="pl-9 font-mono tracking-wider uppercase"
                />
              </div>
              <button
                onClick={handleLookup}
                disabled={!code.trim() || loading}
                className="px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Looking…" : "Look up"}
              </button>
            </div>

            {preview ? (
              <div className="mt-5 rounded-xl border-2 border-foreground/20 bg-secondary/30 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-lg">{preview.name || "Storefront"}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{preview.inviteCode || code}</p>
                    {preview.description && (
                      <p className="text-sm text-muted-foreground mt-2">{preview.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full mt-5 flex items-center justify-center gap-2 py-3 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {connecting ? "Connecting…" : "Connect to this storefront"}
                </button>
              </div>
            ) : (
              <div className="mt-8 text-center text-muted-foreground">
                <Store className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Enter an invite code to preview the storefront</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
