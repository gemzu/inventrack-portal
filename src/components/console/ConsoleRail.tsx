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

import Link from "next/link";
import Mark from "@/components/Mark";
import { LogOut } from "lucide-react";
import { activeHref, flatten, type Section } from "./nav";

export default function ConsoleRail({
  sections,
  pathname,
  userName,
  userRole,
  orgName,
  onNavigate,
  onLogout,
}: {
  sections: Section[];
  pathname: string;
  userName: string | null;
  userRole: string | null;
  orgName?: string | null;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const active = activeHref(pathname, flatten(sections));

  return (
    <div className="flex h-full flex-col border-r border-border bg-background">
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

      {/* Who you are, and the way out. */}
      <div className="shrink-0 border-t border-border px-5 py-4">
        <p className="truncate text-[13px] font-medium">{userName || "Signed in"}</p>
        <p className="truncate text-[12px] text-muted-foreground">
          {userRole || "member"}
          {orgName ? ` · ${orgName}` : ""}
        </p>
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
