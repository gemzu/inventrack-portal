"use client";

/**
 * Store links as bay tags.
 *
 * Two badges dropped at the bottom of a page is the default and says nothing.
 * These are shelf tags instead: a barcode strip, a part code, a destination.
 * Hovering scans one, and it lights the way a bay does everywhere else on the
 * site, so the links belong to the same world as the rest of the page.
 */

import { ArrowUpRight } from "lucide-react";

const STORES = [
  {
    code: "INV-IOS-01",
    platform: "iPhone and iPad",
    store: "App Store",
    href: "https://apps.apple.com/eg/app/invems/id6767224150",
  },
  {
    code: "INV-AND-01",
    platform: "Android",
    store: "Google Play",
    href: "https://play.google.com/store/apps/details?id=com.invems.invems&hl=en",
  },
];

/* An irregular bar pattern. Even stripes read as a texture; uneven ones read
   as a barcode. */
const BARCODE =
  "repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 5px, currentColor 5px 6px, transparent 6px 10px, currentColor 10px 13px, transparent 13px 15px, currentColor 15px 16px, transparent 16px 21px)";

export default function AppLinks() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {STORES.map((s, i) => (
        /* Wrapped rather than revealed directly: .reveal sets a transform, which
           would override the hover lift on the anchor. */
        <div key={s.code} className={`reveal d${i + 1}`}>
        <a
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className="bay-tag group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 text-left transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] hover:-translate-y-1 hover:border-[var(--brand-1)]"
        >
          {/* The tag's barcode. Goes brand-coloured once scanned. */}
          <span
            aria-hidden
            className="block h-8 w-full text-muted-foreground/45 transition-colors duration-300 group-hover:text-[var(--brand-1)]"
            style={{ backgroundImage: BARCODE }}
          />

          <span className="mono mt-4 block text-[13px] text-muted-foreground">
            {s.code}
          </span>

          <span className="mt-1 flex items-center justify-between gap-3">
            <span>
              <span className="block font-display text-base font-bold tracking-tight">
                {s.store}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {s.platform}
              </span>
            </span>
            <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-[transform,color] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--brand-1)]" />
          </span>
        </a>
        </div>
      ))}
    </div>
  );
}
