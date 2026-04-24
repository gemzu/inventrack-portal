"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { connectToStorefront, getStorefrontByCode, getMyStorefronts } from "@/lib/dataService";
import { useToast } from "@/components/Toast";
import { Store, Package, MessageSquare, Check, ArrowRight, Sparkles } from "lucide-react";

interface ConnectedStorefront {
  storefront?: {
    id: string;
    name?: string;
    orgId?: string;
    inviteCode?: string;
  };
}

export default function ConnectStorefrontPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{id?: string; name?: string; description?: string; inviteCode?: string; filterType?: string; ownerId?: string} | null>(null);
  const [loading, setLoading] = useState(false);
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
    try {
      setLoading(true);
      const sf = await getStorefrontByCode(code.trim());
      setPreview(sf as typeof preview);
      if (!sf) toast("No storefront found for that code", "error");
    } catch (e) {
      toast((e as Error).message || "Failed to preview", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user || !preview?.id) return;
    try {
      setLoading(true);
      await connectToStorefront(user.id, String(preview.id));
      toast("Connected! Chat with the owner now", "success");
      const updated = await getMyStorefronts(user.id);
      setConnectedStorefronts(updated as ConnectedStorefront[]);
      setActiveTab("connected");
      router.push("/buyer/messages");
    } catch (e) {
      toast((e as Error).message || "Failed to connect", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F2D3E6 0%, #fce4ec 50%, #f8dce8 100%)' }}>
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(227,152,202,0.3) 0%, rgba(255,255,255,0) 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(227,152,202,0.4) 0%, transparent 40%)' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold" style={{ color: '#1f1a1d' }}>Storefronts</h1>
          <p className="mt-2 text-lg" style={{ color: '#666' }}>Connect to storefronts and chat with owners</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("connected")}
            className={`px-5 py-2.5 rounded-full font-medium transition-all ${activeTab === "connected" ? 'text-white' : 'text-gray-600'}`}
            style={activeTab === "connected" ? { background: '#E398CA', boxShadow: '0 4px 15px rgba(227,152,202,0.5)' } : { background: 'white' }}
          >
            My Storefronts ({connectedStorefronts.length})
          </button>
          <button
            onClick={() => setActiveTab("connect")}
            className={`px-5 py-2.5 rounded-full font-medium transition-all ${activeTab === "connect" ? 'text-white' : 'text-gray-600'}`}
            style={activeTab === "connect" ? { background: '#E398CA', boxShadow: '0 4px 15px rgba(227,152,202,0.5)' } : { background: 'white' }}
          >
            <Sparkles className="w-4 h-4 inline mr-1" /> Connect New
          </button>
        </div>

        {activeTab === "connected" ? (
          <div className="space-y-4">
            {connectedStorefronts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Store className="w-16 h-16 mx-auto opacity-20" style={{ color: '#E398CA' }} />
                <h3 className="text-xl font-semibold mt-4" style={{ color: '#1f1a1d' }}>No storefronts connected</h3>
                <p className="mt-2 text-gray-500 mb-6">Connect to a storefront to browse their inventory</p>
                <Button onClick={() => setActiveTab("connect")} style={{ background: '#E398CA', boxShadow: '0 4px 15px rgba(227,152,202,0.5)' }}>
                  Connect Storefront
                </Button>
              </div>
            ) : (
              <>
                {connectedStorefronts.map((sf) => {
                  const s = sf.storefront;
                  return (
                    <div
                      key={s?.id}
                      className="bg-white rounded-2xl p-5 hover:shadow-xl transition-all"
                      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #F2D3E6 100%)' }}>
                            <Store className="w-7 h-7" style={{ color: '#E398CA' }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg" style={{ color: '#1f1a1d' }}>{s?.name || "Storefront"}</h3>
                            <p className="text-sm text-gray-500">Code: {s?.inviteCode || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href="/buyer/messages">
                            <button className="px-4 py-2 rounded-xl font-medium bg-white border-2 hover:bg-gray-50 transition-all flex items-center gap-2" style={{ borderColor: '#E398CA', color: '#E398CA' }}>
                              <MessageSquare className="w-4 h-4" /> Chat
                            </button>
                          </Link>
                          <Link href="/buyer/catalog">
                            <button className="px-4 py-2 rounded-xl font-medium text-white transition-all flex items-center gap-2" style={{ background: '#E398CA' }}>
                              <Package className="w-4 h-4" /> Catalog
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Link href="/buyer/messages">
                  <div className="bg-gradient-to-r from-[#E398CA] to-[#d88ab8] rounded-2xl p-5 text-white text-center hover:shadow-xl transition-all cursor-pointer">
                    <MessageSquare className="w-6 h-6 inline mr-2" />
                    <span className="font-semibold">Message storefront owners</span>
                  </div>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <label className="text-sm font-medium mb-2 block">Enter invite code</label>
            <div className="flex gap-2">
              <Input 
                value={code} 
                onChange={(e) => setCode(e.target.value.toUpperCase())} 
                placeholder="STORE-XXXX" 
                className="text-lg tracking-wider h-12"
              />
              <Button
                onClick={handleLookup}
                disabled={!code.trim() || loading}
                style={{ background: '#E398CA' }}
              >
                Look Up
              </Button>
            </div>

            {preview ? (
              <div className="mt-6 rounded-xl border-2 p-5" style={{ borderColor: '#E398CA' }}>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #F2D3E6 100%)' }}>
                    <Store className="w-7 h-7" style={{ color: '#E398CA' }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-xl" style={{ color: '#1f1a1d' }}>{preview.name || "Storefront"}</div>
                    <div className="text-sm text-gray-500">Code: {preview.inviteCode || code}</div>
                  </div>
                  <Button
                    onClick={handleConnect}
                    disabled={loading}
                    style={{ background: '#22c55e' }}
                  >
                    <Check className="w-4 h-4 mr-1" /> Connect
                  </Button>
                </div>
                {preview.description && (
                  <p className="text-sm text-gray-600 mb-2">{preview.description}</p>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Store className="w-16 h-16 mx-auto mb-3 opacity-20" />
                <p>Enter a storefront invite code to connect</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}