"use client";

/**
 * The console and the buyer portal are both desktop tools.
 *
 * There was a responsive layout underneath both: a hamburger and a slide-out
 * rail on the console, a glass bottom bar on the buyer side, and twelve-column
 * tables folded down to a 380px strip. It worked in the sense that nothing
 * broke, and it was useless in the sense that nobody would choose it — the
 * phone is where the work actually happens, and the app does it properly with
 * the camera.
 *
 * So phones and tablets get sent to the app instead of a worse copy of a screen
 * meant for a mouse and a wide window. No apology, no "for the best
 * experience": just what the app is better at, and the two links.
 *
 * The two audiences get different reasons because they are doing different
 * jobs. Telling a customer that scanning works better on their phone would be
 * answering a question they never asked.
 */

import Mark from "@/components/Mark";
import { ArrowUpRight } from "lucide-react";

const STORES = [
  {
    platform: "iPhone and iPad",
    store: "App Store",
    href: "https://apps.apple.com/eg/app/invems/id6767224150",
  },
  {
    platform: "Android",
    store: "Google Play",
    href: "https://play.google.com/store/apps/details?id=com.invems.invems&hl=en",
  },
];

const COPY = {
  staff: {
    title: "Use the app",
    body: "Scanning, receiving and counting all happen on the floor, and the app does them with the camera. The console is built for a wide window and a mouse — open it on a computer when you need reports, settings, or the whole table at once.",
  },
  buyer: {
    title: "Use the app",
    body: "Browsing, ordering and chasing an order are quicker in the app, and it keeps the catalog in your pocket. This portal is built for a wide window and a mouse — open it on a computer if you would rather see everything at once.",
  },
} as const;

export default function AppGate({ audience = "staff" }: { audience?: "staff" | "buyer" }) {
  const copy = COPY[audience];

  return (
    <div className="console app-gate min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <Mark className="mark-draw h-14 w-14 text-[var(--brand-2)]" strokeWidth={16} />

      <h1 className="font-display mt-8 text-[1.6rem] font-bold uppercase leading-[1.1] tracking-[-0.03em]">
        {copy.title}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.body}</p>

      <div className="mt-9 flex w-full max-w-sm flex-col gap-3">
        {STORES.map((s) => (
          <a
            key={s.store}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="panel panel-hover flex items-center justify-between gap-4 p-4 text-left"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{s.store}</span>
              <span className="block text-[12px] text-muted-foreground">{s.platform}</span>
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </a>
        ))}
      </div>
    </div>
  );
}
