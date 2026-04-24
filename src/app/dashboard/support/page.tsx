"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTickets, createTicket, updateTicket } from "@/lib/dataService";
import { LifeBuoy, Plus, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { isAdminRole } from "@/lib/roles";

interface Ticket {
  id: string;
  category?: string;
  message?: string;
  status?: string;
  priority?: string;
  adminReply?: string;
  userEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  closed: "bg-muted text-muted-foreground border-border",
};

export default function SupportPage() {
  const { orgId, user, userRole } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ category: "general", message: "", priority: "normal" });
  const [detail, setDetail] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const rows = await getTickets(orgId);
      setItems(rows as unknown as Ticket[]);
    } catch (e) {
      toast((e as Error).message || "Failed to load tickets", "error");
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = statusFilter === "all" ? items : items.filter((t) => t.status === statusFilter);

  const create = async () => {
    if (!orgId || !user || !form.message.trim()) return;
    try {
      await createTicket(orgId, user.id, user.email || "", {
        category: form.category,
        message: form.message.trim(),
        priority: form.priority,
      });
      toast("Ticket submitted", "success");
      setCreateOpen(false);
      setForm({ category: "general", message: "", priority: "normal" });
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to create", "error");
    }
  };

  const sendReply = async () => {
    if (!detail || !reply.trim()) return;
    try {
      await updateTicket(detail.id, { adminReply: reply.trim(), status: "resolved", updatedAt: new Date().toISOString() });
      toast("Reply sent", "success");
      setReply("");
      setDetail(null);
      load();
    } catch (e) {
      toast((e as Error).message || "Failed to send", "error");
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await updateTicket(id, { status, updatedAt: new Date().toISOString() });
      load();
    } catch (e) {
      toast((e as Error).message || "Failed", "error");
    }
  };

  return (
    <PageShell
      title="Support tickets"
      subtitle={`${filtered.length} of ${items.length}`}
      actions={
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button><Plus /> New ticket</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Open a support ticket</DialogTitle>
              <DialogDescription>We&apos;ll reply by email and in-app.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
                >
                  <option value="general">General</option>
                  <option value="billing">Billing</option>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature request</option>
                  <option value="account">Account</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={5}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  placeholder="Describe the issue…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={create}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            onClick={() => setStatusFilter(s)}
          >
            {s.replace("_", " ")}
          </Button>
        ))}
      </div>

      <Card><CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No tickets" description="Submit a new ticket to get help." />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => (
              <li key={t.id} className="p-4 hover:bg-muted/20 cursor-pointer transition" onClick={() => setDetail(t)}>
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{t.category || "general"}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLE[t.status || "open"] || STATUS_STYLE.open}`}>
                        {t.status || "open"}
                      </span>
                      {t.priority && t.priority !== "normal" && (
                        <Badge variant={t.priority === "urgent" ? "destructive" : "secondary"}>{t.priority}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.message}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t.userEmail} · {t.createdAt ? formatDate(t.createdAt) : ""}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.category || "Ticket"}</DialogTitle>
            <DialogDescription>
              {detail?.userEmail} · {detail?.createdAt ? formatDate(detail.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {detail.message}
              </div>
              {detail.adminReply && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm whitespace-pre-wrap">
                  <div className="text-xs text-muted-foreground mb-1">Admin reply</div>
                  {detail.adminReply}
                </div>
              )}
              {isAdminRole(userRole) && detail.status !== "resolved" && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Reply</label>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none dark:bg-input/30"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {isAdminRole(userRole) && detail && detail.status !== "closed" && (
              <Button variant="outline" onClick={() => { setStatus(detail.id, "closed"); setDetail(null); }}>
                Close ticket
              </Button>
            )}
            {isAdminRole(userRole) && reply.trim() && (
              <Button onClick={sendReply}>Send reply</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
