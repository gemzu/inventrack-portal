"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/dataService";
import { Bell, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Note {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  readAt?: string | null;
  createdAt?: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getNotifications(user.id);
      setItems(data as unknown as Note[]);
    } catch (e) {
      toast((e as Error).message || "Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const unreadCount = items.filter((n) => !n.readAt).length;

  const markAll = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      toast("All marked as read", "success");
    } catch (e) {
      toast((e as Error).message || "Failed", "error");
    }
  };

  const markOne = async (id: string) => {
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch (e) {
      toast((e as Error).message || "Failed", "error");
    }
  };

  return (
    <PageShell
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
      actions={
        unreadCount > 0 && (
          <Button variant="outline" onClick={markAll}>
            <Check /> Mark all read
          </Button>
        )
      }
    >
      <Card><CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You'll see alerts and activity updates here." />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const unread = !n.readAt;
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 p-4 transition ${unread ? "bg-primary/5" : ""} hover:bg-muted/30`}
                  onClick={() => unread && markOne(n.id)}
                  role={unread ? "button" : undefined}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${unread ? "bg-primary" : "bg-transparent border border-border"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-sm truncate">{n.title || "Notification"}</div>
                      {n.type && <Badge variant="outline" className="text-[10px]">{n.type}</Badge>}
                    </div>
                    {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                    {n.createdAt && (
                      <div className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent></Card>
    </PageShell>
  );
}
