"use client";

/**
 * The floor, right now.
 *
 * Rebuilt from nothing. The old overview was six tiles, each a rounded card
 * with an icon in a coloured square and a number set smaller than the icon,
 * then a donut, then two more cards. It was a template's idea of a dashboard:
 * you could swap the labels for a CRM's and nothing would look wrong.
 *
 * This is written the way the site talks. The numbers are set in the display
 * face at headline size, because on a stock screen the numbers *are* the
 * content and everything else is a caption. Sections are announced by a name
 * and a hairline, nothing more. Composition is a rack of bars rather than a
 * donut — the same object as the hero, and a shape you can actually read a
 * shortfall off.
 *
 * The data it loads is unchanged. What it says about that data is not.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/utils";
import { normalizeOrderStatus } from "@/lib/orderStatus";
import { itemIdentity } from "@/lib/itemIdentity";
import PageShell from "@/components/page-shell";
import Status from "@/components/Status";
import Mark from "@/components/Mark";
import { AnimatedNumber } from "@/components/motion/primitives";
import { Panel, Rule, Figure, CrateSkeleton } from "@/components/console/surfaces";
import { ArrowUpRight, X } from "lucide-react";

type Announcement = { id: string; title: string; message: string; type: string };
type OrderRow = { id: string; buyer: string; items: number; status: string; at: unknown };
type LogRow = { id: string; code: string; action: string; by: string; at: unknown };

const EMPTY = { items: 0, lowStock: 0, orders: 0, users: 0, pending: 0, fulfillment: 0 };

export default function DashboardPage() {
  const { orgId, userRole, facilities } = useAuth();

  const [stats, setStats] = useState(EMPTY);
  const [composition, setComposition] = useState<{ name: string; value: number }[]>([]);
  const [team, setTeam] = useState({ admins: 0, workers: 0, buyers: 0, active: 0 });
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [byFacility, setByFacility] = useState<Record<string, number>>({});
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const dismissed = typeof window !== "undefined"
          ? localStorage.getItem("dismissed_announcement")
          : null;
        const { data } = await supabase
          .from("announcements")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data?.length && dismissed !== data[0].id) setAnnouncement(data[0] as Announcement);
      } catch {
        /* An announcement failing to load must never take the page with it. */
      }
    })();
  }, []);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }

    (async () => {
      try {
        const { data: invData } = await supabase.from("inventory").select("*").eq("org_id", orgId);
        const items = invData || [];
        const countBy = (s: string) => items.filter((d) => d.status === s).length;

        setComposition(
          [
            { name: "Available", value: countBy("available") },
            { name: "Reserved", value: countBy("reserved") },
            { name: "Sold", value: countBy("sold") },
          ].filter((d) => d.value > 0)
        );

        const [{ count: orderCount }, { data: orderStatuses }, { count: pending }, { data: users }] =
          await Promise.all([
            supabase.from("orders").select("*", { count: "exact", head: true }).eq("org_id", orgId),
            supabase.from("orders").select("status").eq("org_id", orgId),
            supabase.from("approvals").select("*", { count: "exact", head: true })
              .eq("org_id", orgId).eq("status", "pending"),
            supabase.from("users").select("*").eq("org_id", orgId),
          ]);

        const normalized = (orderStatuses || []).map((o) => normalizeOrderStatus(o.status));
        const delivered = normalized.filter((s) => s === "delivered").length;

        const people = users || [];
        setTeam({
          admins: people.filter((u) => u.role === "admin").length,
          workers: people.filter((u) => u.role === "worker").length,
          buyers: people.filter((u) => u.role === "buyer").length,
          active: people.filter((u) => u.active === true).length,
        });

        setStats({
          items: items.length,
          lowStock: items.filter((d) => (d.quantity || 0) <= 2 && d.status === "available").length,
          orders: orderCount || 0,
          users: people.length,
          pending: pending || 0,
          fulfillment: normalized.length ? Math.round((delivered / normalized.length) * 100) : 0,
        });

        if (facilities?.length) {
          const counts: Record<string, number> = {};
          for (const f of facilities) counts[f.id] = items.filter((d) => d.facility_id === f.id).length;
          setByFacility(counts);
        }

        const { data: recentOrders } = await supabase
          .from("orders").select("*").eq("org_id", orgId)
          .order("created_at", { ascending: false }).limit(5);

        setOrders(
          (recentOrders || []).map((d) => ({
            id: d.id,
            buyer: d.buyer_name || d.buyer_email || "Unknown buyer",
            items: Array.isArray(d.items) ? d.items.length : d.item_count || 0,
            status: normalizeOrderStatus(d.status) || "pending_approval",
            at: d.created_at,
          }))
        );

        const { data: scans } = await supabase
          .from("scan_logs").select("*").eq("org_id", orgId)
          .order("created_at", { ascending: false }).limit(8);

        setLogs(
          (scans || []).map((d) => ({
            id: d.id, code: d.barcode, action: d.action, by: d.scanned_by, at: d.created_at,
          }))
        );
      } catch (err) {
        console.error("Overview load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId, facilities]);

  /* ── Not in an org yet ─────────────────────────────────────── */
  if (!orgId && !loading) {
    return (
      <PageShell title="Overview">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="max-w-sm text-center">
            <Mark className="mx-auto h-10 w-10 text-[var(--brand-2)]" />
            <h2 className="font-display mt-6 text-lg font-bold uppercase tracking-[-0.01em]">
              No floor yet
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {userRole === "admin"
                ? "Create an organization and this becomes your floor."
                : "Ask your organization owner for an invite code."}
            </p>
            {userRole === "admin" && (
              <Link
                href="/setup/organization"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--btn-shadow)] transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.30,1)] hover:-translate-y-0.5 hover:bg-primary-dark"
              >
                Create organization <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  /* ── Loading ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <PageShell title="Overview" subtitle="Reading the floor.">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-background p-5">
              <CrateSkeleton className="h-9 w-24 border-0" delay={i * 0.08} />
              <CrateSkeleton className="mt-3 h-2.5 w-16 border-0" delay={i * 0.08 + 0.05} />
            </div>
          ))}
        </div>
        <CrateSkeleton className="h-40 w-full" delay={0.2} />
      </PageShell>
    );
  }

  const total = composition.reduce((n, c) => n + c.value, 0);
  const attention = stats.lowStock > 0 || stats.pending > 0;

  return (
    <PageShell
      title="Overview"
      subtitle="Everything on the floor, as it stands this minute."
      actions={
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3.5 py-2 text-[12px] transition-[border-color,color] duration-300 hover:border-[var(--brand-2)] hover:text-[var(--brand-2)]"
        >
          Open inventory <ArrowUpRight className="h-3 w-3" />
        </Link>
      }
    >
      <div className="space-y-12">
        {announcement && (
          <div className="reveal panel panel-live flex items-start gap-4 p-4">
            <span className="mt-0.5 shrink-0 text-[12px] text-[var(--brand-2)]">
              Notice
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{announcement.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{announcement.message}</p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem("dismissed_announcement", announcement.id);
                setAnnouncement(null);
              }}
              aria-label="Dismiss notice"
              className="shrink-0 text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── 01 The count ────────────────────────────────────────
            One hairline grid, six numbers, nothing between them but
            a rule. Anything needing attention is the only thing that
            takes colour. */}
        <section className="space-y-5">
          <Rule label="The count" />
          <div className="reveal grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-3">
            {[
              { label: "Units on hand", value: stats.items, href: "/dashboard/inventory" },
              { label: "Running low", value: stats.lowStock, href: "/dashboard/inventory", tone: stats.lowStock ? ("warning" as const) : undefined, note: "2 or fewer left" },
              { label: "Orders placed", value: stats.orders, href: "/dashboard/orders" },
              { label: "Waiting on you", value: stats.pending, href: "/dashboard/approvals", tone: stats.pending ? ("brand" as const) : undefined },
              { label: "People", value: stats.users, href: "/dashboard/users", note: `${team.active} active` },
              { label: "Fulfilled", value: stats.fulfillment, suffix: "%", href: "/dashboard/reports" },
            ].map((f) => (
              <Link key={f.label} href={f.href} className="group relative bg-background p-5 transition-colors duration-300 hover:bg-[color-mix(in_oklab,var(--brand-2)_5%,transparent)]">
                <Figure
                  label={f.label}
                  note={f.note}
                  tone={f.tone}
                  suffix={f.suffix}
                  value={<AnimatedNumber value={f.value} />}
                />
                <ArrowUpRight className="absolute right-4 top-4 h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
          {attention && (
            <p className="reveal d1 text-[12px] text-muted-foreground">
              {stats.lowStock > 0 ? `${stats.lowStock} lines short` : ""}
              {stats.lowStock > 0 && stats.pending > 0 ? " · " : ""}
              {stats.pending > 0 ? `${stats.pending} awaiting approval` : ""}
            </p>
          )}
        </section>

        {/* ── 02 Composition ──────────────────────────────────────
            A rack, not a donut. Bars sit on a shared baseline so a
            shortfall reads as a short bar, which is the thing you
            actually want to see at a glance. */}
        {total > 0 && (
          <section className="space-y-5">
            <Rule label="Composition" />
            <div className="reveal panel p-6">
              <div className="flex items-end gap-6" style={{ height: "9rem" }}>
                {composition.map((c, i) => {
                  const pct = Math.round((c.value / total) * 100);
                  return (
                    <div key={c.name} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                      <p className="mono mb-2 text-[11px] tabular-nums text-[var(--brand-2)]">{pct}%</p>
                      <div
                        className="bar-breathe w-full rounded-sm"
                        style={{
                          height: `${Math.max(pct, 2)}%`,
                          background: `linear-gradient(to top, var(--brand-1), color-mix(in oklab, var(--brand-3) ${i * 30}%, var(--brand-2)))`,
                          ["--delay" as string]: `${i * 0.6}s`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-6 border-t border-border pt-4">
                {composition.map((c) => (
                  <div key={c.name} className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {c.name}
                    </p>
                    <p className="mono mt-1 text-sm font-semibold tabular-nums">{c.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 03 Sites ────────────────────────────────────────── */}
        {facilities?.length ? (
          <section className="space-y-5">
            <Rule label="Sites" />
            <div className="grid gap-px overflow-hidden rounded-md bg-border sm:grid-cols-2 lg:grid-cols-3">
              {facilities.map((f) => (
                <div key={f.id} className="reveal bg-background p-5">
                  <p className="truncate text-sm font-semibold">{f.name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {f.state || "—"}
                  </p>
                  <p className="mono mt-4 text-2xl font-bold tabular-nums tracking-tight">
                    {byFacility[f.id] ?? 0}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    units held
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── 04 Moving / 05 Scanned ───────────────────────────── */}
        <div className="grid gap-12 lg:grid-cols-2">
          <section className="space-y-5">
            <Rule label="Moving"
              action={
                <Link
                  href="/dashboard/orders"
                  className="text-[12px] text-muted-foreground transition-colors duration-300 hover:text-[var(--brand-2)]"
                >
                  All
                </Link>
              }
            />
            <Panel className="reveal">
              {orders.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">Nothing has gone out yet.</p>
              ) : (
                orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/dashboard/orders`}
                    className="row-line flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.buyer}</p>
                      <p className="mono truncate text-[12px] text-muted-foreground">
                        {o.items} {o.items === 1 ? "line" : "lines"} · {formatDateTime(o.at as string)}
                      </p>
                    </div>
                    <Status status={o.status} className="shrink-0" />
                  </Link>
                ))
              )}
            </Panel>
          </section>

          <section className="space-y-5">
            <Rule label="Scanned"
              action={
                <Link
                  href="/dashboard/activity"
                  className="text-[12px] text-muted-foreground transition-colors duration-300 hover:text-[var(--brand-2)]"
                >
                  All
                </Link>
              }
            />
            <Panel className="reveal d1">
              {logs.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No scans recorded yet.</p>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="row-line flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="mono truncate text-sm">
                        {itemIdentity({ barcode: l.code, modelId: null, displayName: null }).title}
                      </p>
                      <p className="mono truncate text-[12px] text-muted-foreground">
                        {l.action} · {l.by || "unknown"}
                      </p>
                    </div>
                    <span className="mono shrink-0 text-[11px] text-muted-foreground">
                      {formatDateTime(l.at as string)}
                    </span>
                  </div>
                ))
              )}
            </Panel>
          </section>
        </div>

        {/* ── Team, as one line rather than a card ─────────────── */}
        <section className="space-y-5">
          <Rule label="Team"
            action={
              <Link
                href="/dashboard/users"
                className="text-[12px] text-muted-foreground transition-colors duration-300 hover:text-[var(--brand-2)]"
              >
                Manage
              </Link>
            }
          />
          <div className="reveal flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <Figure label="Members" value={<AnimatedNumber value={stats.users} />} />
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-[12px] text-muted-foreground">
              <span>{team.admins} admin</span>
              <span>{team.workers} worker</span>
              <span>{team.buyers} buyer</span>
              <span className="text-[var(--brand-2)]">{team.active} active</span>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
