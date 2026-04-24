"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageShell from "@/components/page-shell";
import { useAuth } from "@/context/AuthContext";
import { getOrders } from "@/lib/dataService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";

export default function BuyerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!orgId || !user) return;
    getOrders(orgId, { buyerId: user.id })
      .then((rows) => setOrder((rows as Array<Record<string, unknown>>).find((r) => String(r.id) === id) || null))
      .catch((e) => toast((e as Error).message || "Failed to load order", "error"));
  }, [orgId, user, id, toast]);

  return (
    <PageShell title="Order Detail" subtitle={order ? `Order #${String(order.id).slice(0, 8)}` : "Not found"}>
      <Card>
        <CardContent className="p-6 space-y-3">
          {!order ? (
            <div className="text-sm text-muted-foreground">Order not found.</div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline">{String(order.status || "pending")}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">Created {new Date(String(order.createdAt || order.created_at || Date.now())).toLocaleString()}</div>
              <div>
                <h3 className="text-sm font-medium mb-2">Items</h3>
                <pre className="text-xs bg-muted/40 p-3 rounded-md overflow-auto">{JSON.stringify(order.items || [], null, 2)}</pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

