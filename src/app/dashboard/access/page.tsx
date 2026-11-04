"use client";

/**
 * Access - who can do what, in one place. Owner only.
 *
 * Everyone in the company, with the three switches the owner controls
 * (Sales and invoices, Delete, Invoice entry), what each person can and
 * cannot do in plain words, which invoices a data-entry helper may work on
 * and until when, and a record of every change. The switches here are the
 * same ones the Users page used to hold on its own; they call the same
 * database functions, so nothing can disagree.
 *
 * Roles and switching an account off stay on Users. Every rule is enforced by
 * the database (these functions check the caller is the owner), never by this
 * page.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KeyRound, UserPlus, X } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import PageShell from "@/components/page-shell";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { Panel, Figure, ColHead, ListSkeleton } from "@/components/console/surfaces";
import { Action, Drawer, Field, Input, Modal, Select, Toggle } from "@/components/console/controls";
import {
  accessGrantable, accessGrants, accessHistory, accessOverview, describeAccess, grantOrder, revokeOrder,
  resetArea, setArea, setDelete, setEntry, setSales,
  type Area, type Grant, type GrantableOrder, type HistoryRow, type Member,
} from "@/lib/access";
import { fmtDate } from "@/lib/sales";
import { DELETE_ACCESS_ORGS } from "@/lib/roles";

type Key = "can_sales" | "can_delete" | "can_entry";
type SwitchKey = Key | Area;

/* Areas first (they cover what a person can see and change across the website and the app), then the three
   that stand alone. Admins start with the areas they always had; workers with orders only. */
const SWITCHES: { key: SwitchKey; label: string; short: string; hint: string; group: "areas" | "other" }[] = [
  { key: "stock", label: "Stock", short: "Stock", group: "areas", hint: "See, add, edit and delete stock lines, and use the stock tools (prices, label reading, splitting). Boxes, the catalog and scanning in the app are not affected." },
  { key: "purchase_orders", label: "Purchase orders", short: "POs", group: "areas", hint: "See, create and receive purchase orders." },
  { key: "orders", label: "Orders", short: "Orders", group: "areas", hint: "See and handle orders going out. Buyers always see their own orders." },
  { key: "settings", label: "Settings and setup", short: "Setup", group: "areas", hint: "Organization settings, facilities, storefronts and their buyers, and the blacklist." },
  { key: "can_sales", label: "Sales and invoices", short: "Sales", group: "other", hint: "Sales orders, invoices, customers, billing companies and money reports. Admins only." },
  { key: "can_entry", label: "Invoice entry", short: "Entry", group: "other", hint: "May add and change items on the invoices you share with them, and nothing else. Workers only." },
  { key: "can_delete", label: "Delete", short: "Delete", group: "other", hint: "May delete stock and records. Admins and workers." },
];
const isArea = (k: SwitchKey): k is Area => k === "stock" || k === "purchase_orders" || k === "orders" || k === "settings";
const valueOf = (m: Member, k: SwitchKey) => (isArea(k) ? m.perms?.[k] === true : m[k]);

/* Why a switch does not apply to this person, or "" when it does. */
function notFor(m: Member, key: SwitchKey) {
  if (m.is_owner) return "The owner can always do this.";
  if (!m.active) return "This account is switched off.";
  if (key === "can_sales" && m.role !== "admin") return "Only admins can have Sales and invoices.";
  if (key === "can_entry" && m.role !== "worker") return "Invoice entry is for workers. Admins use Sales and invoices.";
  return "";
}

export default function AccessPage() {
  return (
    <AdminGuard>
      <Owner />
    </AdminGuard>
  );
}

function Owner() {
  const { orgId, isOwner, loading, accessReady } = useAuth();
  /* Not "owner only" until the database has actually said so. */
  if (loading || !accessReady) {
    return (
      <PageShell title="Access" subtitle="Who can do what in your company.">
        <ListSkeleton rows={4} />
      </PageShell>
    );
  }
  if (!isOwner || !orgId) {
    return (
      <PageShell title="Access" subtitle="Owner only.">
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Only the owner of the company changes who can do what. If you need something switched on, ask the owner.
        </p>
      </PageShell>
    );
  }
  return <AccessEditor orgId={orgId} />;
}

function AccessEditor({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [helperOpen, setHelperOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, g, h] = await Promise.all([accessOverview(orgId), accessGrants(orgId), accessHistory(orgId, 40)]);
      setMembers(m); setGrants(g); setHistory(h); setError("");
    } catch (e) {
      setError((e as Error).message);
      setMembers((prev) => prev ?? []);
    }
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  /* Delete rights are owner-controlled only where that is switched on (same as the app). */
  const switches = useMemo(() => SWITCHES.filter((s) => s.key !== "can_delete" || DELETE_ACCESS_ORGS.includes(orgId)), [orgId]);
  const byId = useMemo(() => new Map((members || []).map((m) => [m.user_id, m])), [members]);
  const nameOf = (id: string | null) => {
    const m = id ? byId.get(id) : undefined;
    return m ? m.name || m.email || "Someone" : "Someone";
  };

  /* Optimistic: the switch moves at once and goes back if the database says no. */
  const apply = (m: Member, key: SwitchKey, on: boolean): Member =>
    isArea(key) ? { ...m, perms: { ...m.perms, [key]: on } } : { ...m, [key]: on, ...(key === "can_entry" && !on ? { grants: 0 } : {}) };
  const flip = async (m: Member, key: SwitchKey, on: boolean) => {
    setMembers((prev) => (prev || []).map((x) => (x.user_id === m.user_id ? apply(x, key, on) : x)));
    try {
      if (isArea(key)) await setArea(orgId, m.user_id, key, on);
      else if (key === "can_sales") await setSales(orgId, m.user_id, on);
      else if (key === "can_delete") await setDelete(orgId, m.user_id, on);
      else await setEntry(orgId, m.user_id, on);
      toast(`${m.name || m.email}: ${SWITCHES.find((s) => s.key === key)!.label} ${on ? "on" : "off"}`, "success");
      load();
    } catch (e) {
      setMembers((prev) => (prev || []).map((x) => (x.user_id === m.user_id ? apply(x, key, !on) : x)));
      toast((e as Error).message, "error");
    }
  };

  const defaults: Record<string, Record<Area, boolean>> = {
    admin: { stock: true, purchase_orders: true, orders: true, settings: true },
    worker: { stock: false, purchase_orders: false, orders: true, settings: false },
  };
  const changed = (m: Member) => (["stock", "purchase_orders", "orders", "settings"] as Area[]).some((a) => m.perms?.[a] !== defaults[m.role]?.[a]);
  const resetPerson = async (m: Member) => {
    try {
      const n = await resetArea(orgId, m.user_id);
      toast(n ? `${m.name || m.email} follows their role again` : `${m.name || m.email} already follows their role`, "success");
      load();
    } catch (e) { toast((e as Error).message, "error"); }
  };
  const withAccess = (members || []).filter((m) => !m.is_owner && (m.can_sales || m.can_delete || m.can_entry || changed(m))).length;
  const open = openId ? byId.get(openId) || null : null;

  return (
    <PageShell
      title="Access"
      subtitle="Who can do what in your company. Only you, the owner, can change this."
      actions={
        <Action solid onClick={() => setHelperOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" /> Set up a data-entry helper
        </Action>
      }
    >
      {members === null ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-8">
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="People" value={members.length} />
            <Figure label="Set differently from their role" value={withAccess} tone={withAccess ? "brand" : undefined} />
            <Figure label="Invoices shared" value={grants.length} />
          </div>

          {members.length === 0 ? (
            <EmptyState icon={KeyRound} title="Nobody yet" description="People appear here once they have joined with an invite code." />
          ) : (
            <Panel className="reveal">
              <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 md:flex">
                <ColHead className="min-w-0 flex-1">Person</ColHead>
                {switches.map((s) => <span key={s.key} className="w-[4.25rem] shrink-0 text-center" title={`${s.label}: ${s.hint}`}><ColHead>{s.short}</ColHead></span>)}
                <ColHead className="w-16 shrink-0 text-right">Invoices</ColHead>
              </div>
              {members.map((m) => (
                <div key={m.user_id} className="row-line flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <button type="button" onClick={() => setOpenId(m.user_id)} className="min-w-0 flex-1 basis-full text-left md:basis-auto">
                    <p className="truncate text-sm font-medium">
                      {m.name || m.email || "Unnamed"}
                      {m.is_owner ? <span className="ml-2 text-[11px] font-semibold text-[var(--brand-2)]">Owner</span> : null}
                      {!m.active ? <span className="ml-2 text-[11px] font-semibold text-destructive">Switched off</span> : null}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {m.role === "admin" ? "Admin" : "Worker"} · {m.email}
                    </p>
                  </button>
                  {switches.map((s) => {
                    const why = notFor(m, s.key);
                    return (
                      <div key={s.key} className="flex w-[4.25rem] shrink-0 items-center justify-center" title={why || `${s.label}: ${s.hint}`}>
                        {why ? <span className="text-muted-foreground/50" aria-label={`${s.label}: ${why}`}>—</span>
                          : <Toggle value={valueOf(m, s.key)} onChange={(v) => flip(m, s.key, v)} label={`${s.label} for ${m.name || m.email}`} />}
                      </div>
                    );
                  })}
                  <div className="w-16 shrink-0 text-right">
                    <button type="button" onClick={() => setOpenId(m.user_id)} className="mono text-sm tabular-nums text-muted-foreground hover:text-foreground">
                      {m.can_entry ? m.grants : "—"}
                    </button>
                  </div>
                </div>
              ))}
            </Panel>
          )}

          <section className="reveal">
            <h2 className="font-display mb-3 text-[15px] font-bold tracking-[-0.015em]">Recent changes</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet. Every change to who can do what is recorded here.</p>
            ) : (
              <Panel>
                {history.map((h) => (
                  <div key={h.id} className="row-line flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
                    <span className="mono w-40 shrink-0 text-[12px] text-muted-foreground">{new Date(h.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    <span className="min-w-0 flex-1">{h.summary}{h.target_user_id && !h.summary.includes(nameOf(h.target_user_id)) ? ` (${nameOf(h.target_user_id)})` : ""}</span>
                    <span className="text-[12px] text-muted-foreground">{h.actor_email}</span>
                  </div>
                ))}
              </Panel>
            )}
          </section>
        </div>
      )}

      <PersonDrawer
        orgId={orgId} switches={switches} member={open} grants={grants.filter((g) => open && g.user_id === open.user_id)}
        history={history.filter((h) => open && h.target_user_id === open.user_id)}
        onClose={() => setOpenId(null)} onFlip={flip} onChanged={load} onReset={resetPerson}
      />
      <HelperModal open={helperOpen} orgId={orgId} members={members || []} onClose={() => setHelperOpen(false)} onDone={() => { setHelperOpen(false); load(); }} />
    </PageShell>
  );
}

/* ── One person ───────────────────────────────────────────────── */

function PersonDrawer({
  orgId, switches, member, grants, history, onClose, onFlip, onChanged, onReset,
}: {
  orgId: string; switches: typeof SWITCHES; member: Member | null; grants: Grant[]; history: HistoryRow[];
  onClose: () => void; onFlip: (m: Member, key: SwitchKey, on: boolean) => void; onChanged: () => void; onReset: (m: Member) => void;
}) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<GrantableOrder[]>([]);
  const [pick, setPick] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const memberId = member?.user_id;
  const entryOn = Boolean(member?.can_entry);

  useEffect(() => {
    if (!memberId || !entryOn) return;
    let live = true;
    accessGrantable(orgId).then((o) => { if (live) setOrders(o); }).catch(() => { if (live) setOrders([]); });
    return () => { live = false; };
  }, [orgId, memberId, entryOn, grants.length]);

  if (!member) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;
  const sharedIds = new Set(grants.map((g) => g.order_id));
  const free = orders.filter((o) => !sharedIds.has(o.order_id));
  const { can, cannot } = describeAccess(member);

  const share = async () => {
    if (!pick) return;
    setBusy(true);
    try {
      await grantOrder(orgId, member.user_id, pick, until ? new Date(`${until}T23:59:59`).toISOString() : null);
      toast("Invoice shared", "success");
      setPick(""); setUntil("");
      onChanged();
    } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  };
  const remove = async (g: Grant) => {
    try {
      await revokeOrder(orgId, member.user_id, g.order_id);
      toast(`${g.number} is no longer shared`, "success");
      onChanged();
    } catch (e) { toast((e as Error).message, "error"); }
  };

  return (
    <Drawer open onClose={onClose} title={member.name || member.email || "Person"} subtitle={`${member.is_owner ? "Owner" : member.role === "admin" ? "Admin" : "Worker"} · ${member.email}`}>
      <div className="space-y-7">
        <section>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Right now they can</h3>
          <ul className="space-y-1.5 text-sm">
            {can.map((c) => <li key={c} className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span><span>{c}</span></li>)}
          </ul>
          <h3 className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">They cannot</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {cannot.map((c) => <li key={c} className="flex gap-2"><span>✕</span><span>{c}</span></li>)}
          </ul>
        </section>

        {(["areas", "other"] as const).map((group) => (
        <section key={group}>
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">{group === "areas" ? "Areas" : "Sales, invoice entry and delete"}</h3>
          <div className="space-y-4">
            {switches.filter((s) => s.group === group).map((s) => {
              const why = notFor(member, s.key);
              return (
                <div key={s.key} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{why || s.hint}</p>
                  </div>
                  {why ? null : <Toggle value={valueOf(member, s.key)} onChange={(v) => onFlip(member, s.key, v)} label={`${s.label} for ${member.name || member.email}`} />}
                </div>
              );
            })}
          </div>
          {group === "areas" ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 flex-1 text-[12px] text-muted-foreground">Enforced by the database, so it holds on the website and in the phone app.</p>
              {!member.is_owner ? <button type="button" onClick={() => onReset(member)} className="text-[12px] font-semibold underline underline-offset-2 hover:text-foreground">Reset to role defaults</button> : null}
            </div>
          ) : null}
        </section>
        ))}

        <section>
          <p className="text-[12px] text-muted-foreground">
            Role, and switching the whole account off, are on the <Link href="/dashboard/users" className="underline underline-offset-2 hover:text-foreground">Users</Link> page.
          </p>
        </section>

        {member.can_entry ? (
          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Invoices they can work on</h3>
            {grants.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet. They see nothing until you share one.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {grants.map((g) => (
                  <li key={g.grant_id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{g.number}{g.customer_name ? ` · ${g.customer_name}` : ""}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{g.company_name || "—"} · {g.expires_at ? `until ${fmtDate(g.expires_at)}` : "no end date"}</p>
                    </div>
                    <button type="button" onClick={() => remove(g)} aria-label={`Stop sharing ${g.number}`} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 space-y-3 rounded-md border border-border p-3">
              <Field label="Share a draft invoice">
                <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Invoice to share">
                  <option value="">{free.length ? "Choose an invoice" : "No other draft invoices"}</option>
                  {free.map((o) => <option key={o.order_id} value={o.order_id}>{o.number}{o.customer_name ? ` · ${o.customer_name}` : " · no customer yet"}{o.company_name ? ` · ${o.company_name}` : ""}</option>)}
                </Select>
              </Field>
              <Field label="Until (optional)" hint="Their access to it ends at the end of that day.">
                <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} aria-label="Access ends" />
              </Field>
              <Action solid onClick={share} disabled={!pick || busy}>Share this invoice</Action>
            </div>
          </section>
        ) : null}

        {history.length ? (
          <section>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">History</h3>
            <ul className="space-y-1.5 text-[13px]">
              {history.slice(0, 10).map((h) => (
                <li key={h.id} className="flex gap-3"><span className="mono w-28 shrink-0 text-[12px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span><span>{h.summary}</span></li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}

/* ── The short way: a data-entry helper in one step ─────────────── */

function HelperModal({
  open, orgId, members, onClose, onDone,
}: {
  open: boolean; orgId: string; members: Member[]; onClose: () => void; onDone: () => void;
}) {
  const { toast } = useToast();
  const workers = members.filter((m) => m.role === "worker" && m.active && !m.is_owner);
  const [who, setWho] = useState("");
  const [order, setOrder] = useState("");
  const [until, setUntil] = useState("");
  const [orders, setOrders] = useState<GrantableOrder[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    accessGrantable(orgId).then((o) => { if (live) setOrders(o); }).catch(() => { if (live) setOrders([]); });
    return () => { live = false; };
  }, [open, orgId]);

  const go = async () => {
    if (!who || !order) return;
    setBusy(true);
    try {
      const w = workers.find((x) => x.user_id === who);
      if (w && !w.can_entry) await setEntry(orgId, who, true);
      await grantOrder(orgId, who, order, until ? new Date(`${until}T23:59:59`).toISOString() : null);
      toast("Done. They can now add items to that invoice and nothing else.", "success");
      setWho(""); setOrder(""); setUntil("");
      onDone();
    } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Set up a data-entry helper" subtitle="They add items to one invoice and see nothing else.">
      <div className="space-y-4">
        {workers.length === 0 ? (
          <p className="rounded-md bg-amber-500/10 p-3 text-[13px] text-amber-800 dark:text-amber-200">
            There are no workers yet. First invite them on <Link href="/dashboard/invites" className="underline underline-offset-2">Invites</Link> (they join with the worker code), then come back here.
          </p>
        ) : null}
        <Field label="Who">
          <Select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Worker">
            <option value="">Choose a worker</option>
            {workers.map((w) => <option key={w.user_id} value={w.user_id}>{w.name || w.email}{w.can_entry ? " (already has Invoice entry)" : ""}</option>)}
          </Select>
        </Field>
        <Field label="Which invoice" hint="Only draft invoices can be shared; once it is sent, nobody can change its items.">
          <Select value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Draft invoice">
            <option value="">{orders.length ? "Choose an invoice" : "No draft invoices yet"}</option>
            {orders.map((o) => <option key={o.order_id} value={o.order_id}>{o.number}{o.customer_name ? ` · ${o.customer_name}` : " · no customer yet"}{o.company_name ? ` · ${o.company_name}` : ""}</option>)}
          </Select>
        </Field>
        <Field label="Until (optional)">
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} aria-label="Access ends" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Action onClick={onClose}>Cancel</Action>
          <Action solid onClick={go} disabled={!who || !order || busy}>Switch on and share</Action>
        </div>
      </div>
    </Modal>
  );
}
