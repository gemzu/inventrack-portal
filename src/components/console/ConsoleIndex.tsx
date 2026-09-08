"use client";

/**
 * The dashboard index.
 *
 * Same object as the public site's index — a bay door that drops in three
 * slats, destinations that rise from behind a clipped edge, a readout for
 * whatever you are pointing at — except this one also searches the floor.
 *
 * Search was a real gap: there was no way to find one barcode without first
 * guessing which screen it lived on. Typing here queries stock and orders
 * directly, so the same gesture that navigates also finds things. Destinations
 * stay listed while you type, filtered, because "inventory" should reach the
 * page as readily as it reaches an item.
 *
 * Opens with the key most people already try for this, and closes on Escape.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { itemIdentity } from "@/lib/itemIdentity";
import { flatten, visibleSections, type Dest } from "./nav";

type Hit = { href: string; label: string; meta: string; kind: "stock" | "order" };

export default function ConsoleIndex({
  open,
  onClose,
  role,
  permissions,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  role: string | null;
  permissions: string | null;
  orgId: string | null;
}) {
  const router = useRouter();
  const dests = useMemo(() => flatten(visibleSections(role, permissions)), [role, permissions]);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const matched: Dest[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dests;
    return dests.filter(
      (d) => d.label.toLowerCase().includes(q) || d.meta.toLowerCase().includes(q)
    );
  }, [dests, query]);

  const rows = useMemo(
    () => [
      ...matched.map((d) => ({ href: d.href, label: d.label, meta: d.meta, kind: "page" as const })),
      ...hits,
    ],
    [matched, hits]
  );

  /* Reset every time it opens: a stale query from ten minutes ago is never
     what you meant by pressing the key again. */
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setCursor(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 260);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* Live search, debounced. Two characters is the point where results stop
     being the whole table. */
  useEffect(() => {
    const q = query.trim();
    if (!open || !orgId || q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const like = `%${q}%`;
        const [stock, orders] = await Promise.all([
          supabase
            .from("inventory")
            .select("id,barcode,model_id,display_name,quantity,status")
            .eq("org_id", orgId)
            .or(`barcode.ilike.${like},model_id.ilike.${like},display_name.ilike.${like}`)
            .limit(6),
          supabase
            .from("orders")
            .select("id,buyer_name,buyer_email,status")
            .eq("org_id", orgId)
            .or(`buyer_name.ilike.${like},buyer_email.ilike.${like}`)
            .limit(4),
        ]);

        const stockHits: Hit[] = (stock.data || []).map((r) => {
          const id = itemIdentity({
            displayName: r.display_name as string | null,
            modelId: r.model_id as string | null,
            barcode: r.barcode as string | null,
          });
          return {
            href: `/dashboard/inventory?q=${encodeURIComponent((r.barcode as string) || id.title)}`,
            label: id.title,
            meta: `${r.quantity ?? 0} in stock · ${String(r.status || "unknown")}`,
            kind: "stock",
          };
        });

        const orderHits: Hit[] = (orders.data || []).map((r) => ({
          href: `/dashboard/orders?q=${encodeURIComponent(String(r.buyer_name || r.buyer_email || ""))}`,
          label: String(r.buyer_name || r.buyer_email || "Order"),
          meta: `Order · ${String(r.status || "pending").replace(/_/g, " ")}`,
          kind: "order",
        }));

        setHits([...stockHits, ...orderHits]);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [query, open, orgId]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  /* Arrow keys move the cursor, Enter takes it. A list you can only click is
     not much of an improvement on the rail beside it. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && rows[cursor]) {
      e.preventDefault();
      go(rows[cursor].href);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => setCursor(0), [query]);

  const focused = rows[cursor];

  return (
    <div id="console-index" className="site-index" data-open={open} aria-hidden={!open}>
      <button
        type="button"
        aria-label="Close index"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className="site-index__backdrop"
      />

      <div
        ref={panelRef}
        className="site-index__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard index and search"
      >
        <span className="site-index__slat" style={{ transitionDelay: open ? "0ms" : "160ms" }} />
        <span className="site-index__slat" style={{ transitionDelay: "80ms" }} />
        <span className="site-index__slat" style={{ transitionDelay: open ? "160ms" : "0ms" }} />

        <div className="relative mx-auto flex h-full max-w-6xl flex-col gap-8 px-6 pb-12 pt-20 lg:flex-row lg:gap-16">
          <div className="flex min-h-0 flex-1 flex-col">
            {/* The search line is a rule you type on, not a boxed input. */}
            <div className="index-readout shrink-0 border-b border-border pb-4" data-open={open}>
              <label htmlFor="console-search" className="mono block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Find
              </label>
              <input
                id="console-search"
                ref={inputRef}
                value={query}
                tabIndex={open ? 0 : -1}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Barcode, item, buyer, or a page"
                autoComplete="off"
                className="font-display mt-2 w-full bg-transparent text-[1.5rem] font-bold tracking-[-0.02em] outline-none placeholder:font-body placeholder:text-[1rem] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground sm:text-[2rem]"
              />
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-2">
              {rows.length === 0 ? (
                <p className="mono text-sm text-muted-foreground">
                  {searching ? "Searching the floor" : "Nothing matches that"}
                </p>
              ) : (
                <ul>
                  {rows.map((r, i) => (
                    <li key={`${r.kind}-${r.href}-${i}`} className="overflow-hidden">
                      <Link
                        href={r.href}
                        tabIndex={open ? 0 : -1}
                        onClick={(e) => {
                          e.preventDefault();
                          go(r.href);
                        }}
                        onMouseEnter={() => setCursor(i)}
                        onFocus={() => setCursor(i)}
                        className="index-link group block py-0.5"
                        style={{ ["--d" as string]: `${0.3 + Math.min(i, 9) * 0.045}s` }}
                      >
                        <span className="index-link__inner flex items-baseline gap-4">
                          <span className="mono text-[12px] text-muted-foreground">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={`font-display text-[1.15rem] font-bold uppercase leading-[1.25] tracking-[-0.01em] transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:text-[1.5rem] ${
                              i === cursor ? "text-[var(--brand-2)]" : ""
                            }`}
                          >
                            {r.label}
                          </span>
                          {r.kind !== "page" && (
                            <span className="mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              {r.kind}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Readout for whatever the cursor is on. Figures, not shapes. */}
          <aside className="index-readout w-full shrink-0 self-end lg:w-64 lg:self-center" data-open={open}>
            <p className="mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Readout
            </p>
            <p key={`${cursor}-${focused?.href}`} className="feed-line mono mt-3 text-sm leading-relaxed text-[var(--brand-2)]">
              {focused?.meta || "Type to search stock, orders, and pages."}
            </p>
            <p className="mono mt-8 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
              Arrows to move · Enter to open · Esc to close
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
