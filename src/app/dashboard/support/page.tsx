"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTickets, createTicket, updateTicket } from "@/lib/dataService";
import { LifeBuoy, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import PageShell from "@/components/page-shell";
import Status from "@/components/Status";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, Chip, Drawer, Field, Modal, Select, Textarea } from "@/components/console/controls";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
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

  const open = items.filter((t) => (t.status || "open") === "open").length;

  return (
    <PageShell
      title="Support"
      subtitle="Tickets you have raised, and anything waiting on a reply."
      actions={
        <Action solid onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New ticket
        </Action>
      }
    >
      <div className="space-y-8">
        <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <Figure label="Open" value={open} tone={open ? "brand" : undefined} />
          <Figure label="All tickets" value={items.length} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
            <Chip key={s} on={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s.replace("_", " ")}
            </Chip>
          ))}
        </div>

        {loading ? (
          <ListSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No tickets"
            description="Raise one and it lands with us by email and in-app."
          />
        ) : (
          <Panel className="reveal">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setDetail(t)}
                className="row-line block w-full px-5 py-4 text-left"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="truncate text-sm font-medium capitalize">
                    {t.category || "general"}
                  </span>
                  <Status status={t.status || "open"} className="shrink-0" />
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {t.message}
                </p>
                <p className="mono mt-2 truncate text-[12px] text-muted-foreground">
                  {t.priority && t.priority !== "normal" ? `${t.priority} · ` : ""}
                  {t.userEmail}
                  {t.createdAt ? ` · ${formatDate(t.createdAt)}` : ""}
                </p>
              </button>
            ))}
          </Panel>
        )}
      </div>

      {/* ── Raise a ticket ──────────────────────────────────── */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Open a ticket"
        subtitle="We reply by email and in-app"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="About">
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="bug">Something is broken</option>
                <option value="feature">A request</option>
                <option value="account">Account</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </Field>
          </div>
          <Field label="What happened" hint="What you did, what you expected, what happened instead.">
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={6}
              placeholder="Describe the issue"
            />
          </Field>
          <div className="flex gap-3">
            <Action onClick={() => setCreateOpen(false)} className="flex-1">
              Cancel
            </Action>
            <Action solid onClick={create} disabled={!form.message.trim()} className="flex-1">
              Send
            </Action>
          </div>
        </div>
      </Modal>

      {/* ── One ticket ──────────────────────────────────────── */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.category || "Ticket"}
        subtitle={`${detail?.userEmail || ""}${detail?.createdAt ? ` · ${formatDate(detail.createdAt)}` : ""}`}
        footer={
          detail && isAdminRole(userRole) ? (
            <>
              {detail.status !== "closed" && (
                <Action
                  onClick={() => { setStatus(detail.id, "closed"); setDetail(null); }}
                  className="flex-1"
                >
                  Close ticket
                </Action>
              )}
              {reply.trim() && (
                <Action solid onClick={sendReply} className="flex-1">
                  Send reply
                </Action>
              )}
            </>
          ) : (
            <Action onClick={() => setDetail(null)} className="flex-1">
              Close
            </Action>
          )
        }
      >
        {detail && (
          <div className="space-y-6">
            <div>
              <ColHead className="mb-2 block">Reported</ColHead>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{detail.message}</p>
            </div>

            {detail.adminReply && (
              <div className="border-t border-border pt-5">
                <ColHead className="mb-2 block">Our reply</ColHead>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--brand-2)]">
                  {detail.adminReply}
                </p>
              </div>
            )}

            {isAdminRole(userRole) && detail.status !== "resolved" && (
              <Field label="Reply" className="border-t border-border pt-5">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={5}
                  placeholder="What you are going to do about it"
                />
              </Field>
            )}
          </div>
        )}
      </Drawer>
    </PageShell>
  );
}
