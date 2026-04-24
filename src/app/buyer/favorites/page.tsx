"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { getFavorites, toggleFavorite } from "@/lib/dataService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function BuyerFavoritesPage() {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    if (!user || !orgId) return;
    getFavorites(orgId, user.id).then((rows) => setItems(rows as Array<Record<string, unknown>>)).catch((e) => toast((e as Error).message || "Failed to load favorites", "error"));
  }, [user, orgId, toast]);

  return (
    <PageShell title="Favorites" subtitle={`${items.length} saved item(s)`}>
      {items.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState icon={Heart} title="No favorites" description="Favorite products in catalog to find them here." /></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={String(it.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{String(it.displayName || it.modelId || "Item")}</div>
                  <div className="text-xs text-muted-foreground font-mono">{String(it.barcode || "")}</div>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!user) return;
                    await toggleFavorite(String(it.id), user.id);
                    setItems((prev) => prev.filter((p) => String(p.id) !== String(it.id)));
                  }}
                >
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}

