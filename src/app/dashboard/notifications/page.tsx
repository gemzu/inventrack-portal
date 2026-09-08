"use client";

/**
 * Notifications.
 *
 * Unread used to be a violet-tinted row plus a violet dot plus an outlined
 * type badge — three signals for one bit of information. It is now one: the
 * unread rows keep a lit left edge, and reading one puts it out.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/dataService";
import { Bell } from "lucide-react";
import { formatDate } from "@/lib/utils";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Panel, Figure, ListSkeleton } from "@/components/console/surfaces";
import { Action } from "@/components/console/controls";

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

  const unreadCount = useMemo(() => items.filter((n) => !n.readAt).length, [items]);

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
      subtitle="What the floor has told you since you were last here."
      actions={
        unreadCount > 0 ? <Action onClick={markAll}>Mark all read</Action> : undefined
      }
    >
      {loading ? (
        <ListSkeleton rows={6} />
      ) : (
        <div className="space-y-8">
          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="Unread" value={unreadCount} tone={unreadCount ? "brand" : undefined} />
            <Figure label="All time" value={items.length} />
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nothing waiting"
              description="Alerts and activity updates land here."
            />
          ) : (
            <Panel className="reveal">
              {items.map((n) => {
                const unread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => unread && markOne(n.id)}
                    role={unread ? "button" : undefined}
                    tabIndex={unread ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (unread && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        markOne(n.id);
                      }
                    }}
                    className={`row-line relative flex gap-4 px-5 py-3.5 ${unread ? "cursor-pointer" : ""}`}
                  >
                    {/* Unread is one signal: a lit edge. */}
                    {unread && (
                      <span className="absolute inset-y-3 left-0 w-0.5 rounded-sm bg-[linear-gradient(to_bottom,var(--brand-1),var(--brand-3))]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${unread ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                        {n.title || "Notification"}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                      )}
                      <p className="mono mt-1.5 truncate text-[12px] text-muted-foreground">
                        {n.type ? `${n.type} · ` : ""}
                        {n.createdAt ? formatDate(n.createdAt) : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </Panel>
          )}
        </div>
      )}
    </PageShell>
  );
}
