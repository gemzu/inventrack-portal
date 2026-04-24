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
import { Store, Package, MapPin, ArrowRight, Check } from "lucide-react";

export default function ConnectStorefrontPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{id?: string; name?: string; description?: string; inviteCode?: string; filterType?: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectedStorefronts, setConnectedStorefronts] = useState<Array<{storefront?: {id?: string, name?: string}}>>([]);

  // Load already connected storefronts
  useEffect(() => {
    if (!user) return;
    getMyStorefronts(user.id)
      .then((sf) => setConnectedStorefronts(sf as Record<string, unknown>[]))
      .catch(() => {});
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                Storefronts
              </span>
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Connect to storefronts to browse their inventory
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Connected Storefronts as Tabs */}
        {connectedStorefronts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Your Connected Storefronts</h2>
            <div className="flex flex-wrap gap-3">
              {(connectedStorefronts).map((sf) => (
                <Link
                  key={(sf as {storefront?: {id?: string}}).storefront?.id}
                  href="/buyer/catalog"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <Check className="w-4 h-4 text-success" />
                  <span className="font-medium">{(sf as {storefront?: {name?: string}}).storefront?.name}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Connect New */}
        <div className="max-w-xl">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Enter invite code</label>
                <Input 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.toUpperCase())} 
                  placeholder="STORE-XXXX" 
                  className="text-lg tracking-wider"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const sf = await getStorefrontByCode(code.trim());
                      setPreview(sf as {id?: string; name?: string; description?: string; inviteCode?: string; filterType?: string} | null);
                      if (!sf) toast("No storefront found for that code", "error");
                    } catch (e) {
                      toast((e as Error).message || "Failed to preview", "error");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={!code.trim() || loading}
                >
                  Look Up
                </Button>
                <Button
                  onClick={async () => {
                    if (!user || !preview?.id) return;
                    try {
                      setLoading(true);
                      await connectToStorefront(user.id, String(preview.id));
                      toast("Connected! Browse their catalog now", "success");
                      router.push("/buyer/catalog");
                    } catch (e) {
                      toast((e as Error).message || "Failed to connect", "error");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={!preview || loading}
                >
                  Connect
                </Button>
              </div>

              {preview ? (
                <div className="rounded-xl border p-5 bg-card/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Store className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{preview.name || "Storefront"}</div>
                      <div className="text-sm text-muted-foreground">Code: {preview.inviteCode || code}</div>
                    </div>
                  </div>
                  {preview.description && (
                    <p className="text-sm text-muted-foreground mb-3">{preview.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {String(preview.filterType || "all")} items
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Enter a storefront invite code to connect</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Messages section */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Messages</h2>
          <Link href="/buyer/messages">
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Chat with storefront owners</div>
                    <div className="text-sm text-muted-foreground">Message connected storefront owners</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}