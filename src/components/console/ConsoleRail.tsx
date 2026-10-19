"use client";

/**
 * The rail.
 *
 * A destination is its name and a hairline that grows down the left edge when
 * it is live. Nothing else.
 *
 * It briefly carried a mono ordinal on every entry, borrowed from the site's
 * full-screen index. That works there — five destinations, set huge, where the
 * numbers read as a contents page. Down a sidebar of twenty-two it was just a
 * column of digits nobody would ever count, competing with the labels for
 * attention and making the whole thing look like a spec sheet. Removed.
 *
 * Icons stay, at glyph size: on a list this long they help you find your place
 * without becoming the loudest thing in the column.
 *
 * What it deliberately is not: pill-shaped buttons with an icon in a rounded
 * square and a filled violet background on the active one. That is the shape
 * every admin template ships with.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Mark from "@/components/Mark";
import { Check, ChevronsUpDown, Loader2, LogOut } from "lucide-react";
import type { Membership } from "@/context/AuthContext";
import { activeHref, flatten, type Section } from "./nav";

export default function ConsoleRail({
  sections,
  pathname,
  userName,
  userRole,
  orgName,
  onNavigate,
  onLogout,
  memberships = [],
  activeOrgId = null,
  onSwitchOrg,
}: {
  sections: Section[];
  pathname: string;
  userName: string | null;
  userRole: string | null;
  orgName?: string | null;
  onNavigate?: () => void;
  onLogout: () => void;
  memberships?: Membership[];
  activeOrgId?: string | null;
  onSwitchOrg?: (orgId: string) => Promise<void>;
}) {
  const active = activeHref(pathname, flatten(sections));

  return (
    <div className="flex h-full flex-col border-r border-border bg-sidebar">
      {/* Identity. The mark, at the size the header uses it. */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-5">
        <Link href="/" onClick={onNavigate} className="group flex items-center gap-2.5">
          <Mark className="h-6 w-6 text-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110" />
          <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.02em]">
            Invems
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-6">
        {sections.map((section, s) => (
          <div key={section.label} className={s > 0 ? "mt-7" : ""}>
            <p className="rail-group__label mb-2.5">{section.label}</p>
            <ul>
              {section.items.map((item) => {
                const isActive = active === item.href;
                return (
                  <li key={item.href} className="reveal-line">
                    <span className="reveal-line__inner block">
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        data-active={isActive}
                        aria-current={isActive ? "page" : undefined}
                        className="rail-link"
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        <span className="truncate text-[13.5px] font-medium">{item.label}</span>
                      </Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Who you are, which company, and the way out. */}
      <div className="shrink-0 border-t border-border px-5 py-4">
        <p className="truncate text-[13px] font-medium">{userName || "Signed in"}</p>
        {memberships.length > 1 && onSwitchOrg ? (
          <OrgSwitcher
            memberships={memberships}
            activeOrgId={activeOrgId}
            role={userRole}
            fallbackName={orgName || null}
            onSwitch={onSwitchOrg}
          />
        ) : (
          <p className="truncate text-[12px] text-muted-foreground">
            {userRole || "member"}
            {orgName ? ` · ${orgName}` : ""}
          </p>
        )}
        <button
          onClick={onLogout}
          className="mt-3 inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors duration-300 hover:text-destructive"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </div>
    </div>
  );
}

/* The company switcher, for accounts in more than one company - what the
   phone app has under Organizations. The website opened whichever company
   the account was last switched to on a phone and offered no way to change
   it (2026-10-19). Same switch underneath, so the phone follows too. */
function OrgSwitcher({
  memberships,
  activeOrgId,
  role,
  fallbackName,
  onSwitch,
}: {
  memberships: Membership[];
  activeOrgId: string | null;
  role: string | null;
  fallbackName: string | null;
  onSwitch: (orgId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); window.removeEventListener("keydown", esc); };
  }, [open]);

  /* Several companies can share a name ("Asset Recovery" three times); the
     start of the id tells them apart. */
  const counts = memberships.reduce<Record<string, number>>((m, x) => ((m[x.name] = (m[x.name] || 0) + 1), m), {});
  const label = (m: Membership) => (counts[m.name] > 1 ? `${m.name} · ${m.orgId.slice(0, 4)}` : m.name);
  const current = memberships.find((m) => m.orgId === activeOrgId);

  const pick = async (orgId: string) => {
    if (orgId === activeOrgId || busy) { setOpen(false); return; }
    setBusy(orgId);
    setError(null);
    try {
      await onSwitch(orgId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch company");
      setBusy(null);
    }
  };

  return (
    <div ref={box} className="relative mt-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex w-full items-center gap-1.5 rounded-md py-0.5 text-left text-[12px] text-muted-foreground transition-colors duration-300 hover:text-foreground"
      >
        <span className="min-w-0 flex-1 truncate">
          {role || "member"} · {current ? label(current) : fallbackName || "Choose a company"}
        </span>
        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-70" />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Switch company"
          className="panel panel-live absolute bottom-full left-0 right-0 z-40 mb-2 max-h-72 overflow-y-auto bg-background py-1 shadow-xl"
        >
          <p className="mono px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Companies</p>
          {memberships.map((m) => {
            const on = m.orgId === activeOrgId;
            return (
              <button
                key={m.orgId}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => pick(m.orgId)}
                disabled={!!busy}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--brand-2)_8%,transparent)] disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{label(m)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{m.role || "member"}</span>
                </span>
                {busy === m.orgId ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--brand-2)]" />
                ) : on ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[var(--brand-2)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
