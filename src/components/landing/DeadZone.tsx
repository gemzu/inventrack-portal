"use client";

/**
 * THE DEAD ZONE.
 *
 * The back of a warehouse has no signal. Most tools quietly fail there; Invems
 * queues the scans and flushes them on reconnect.
 *
 * Earlier version emptied the panel once everything synced, which left a large
 * void exactly at the moment the story pays off. The scans now stay on screen
 * and turn from pending to confirmed one at a time, so the panel is fullest
 * when the point lands.
 *
 * Scrubbed with useScrollScrub; CSS sticky does the pinning.
 */

import { useCallback, useRef, useState } from "react";
import { WifiOff, Check, RefreshCw } from "lucide-react";
import { useScrollScrub } from "@/components/motion/useScrollScrub";
import ScanText from "@/components/motion/ScanText";

const QUEUE = [
  { sku: "PGD1668M", bay: "C1", qty: 24 },
  { sku: "MX1473", bay: "C2", qty: 8 },
  { sku: "Z619", bay: "C3", qty: 2 },
  { sku: "TRN0442", bay: "C4", qty: 16 },
  { sku: "KLM8891", bay: "D1", qty: 40 },
  { sku: "QP2210", bay: "D2", qty: 6 },
];

type Phase = "online" | "offline" | "syncing" | "synced";

const STATUS: Record<Phase, string> = {
  online: "Connected",
  offline: "No signal",
  syncing: "Back in range",
  synced: "All caught up",
};

/* Bars lit, out of four. */
const SIGNAL: Record<Phase, number> = { online: 4, offline: 0, syncing: 2, synced: 4 };

export default function DeadZone() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("online");
  const [queued, setQueued] = useState(0);
  const [confirmed, setConfirmed] = useState(0);

  const onProgress = useCallback((p: number) => {
    const n = QUEUE.length;
    if (p < 0.16) {
      setPhase("online");
      setQueued(0);
      setConfirmed(0);
    } else if (p < 0.58) {
      setPhase("offline");
      const t = (p - 0.16) / (0.58 - 0.16);
      setQueued(Math.min(n, Math.ceil(t * n)));
      setConfirmed(0);
    } else if (p < 0.86) {
      setPhase("syncing");
      setQueued(n);
      const t = (p - 0.58) / (0.86 - 0.58);
      setConfirmed(Math.min(n, Math.ceil(t * n)));
    } else {
      setPhase("synced");
      setQueued(n);
      setConfirmed(n);
    }
  }, []);

  const onReduced = useCallback(() => {
    setPhase("synced");
    setQueued(QUEUE.length);
    setConfirmed(QUEUE.length);
  }, []);

  useScrollScrub(trackRef, onProgress, onReduced);

  const offline = phase === "offline";

  return (
    <section aria-labelledby="deadzone-heading" className="border-t border-border">
      <div ref={trackRef} className="relative" style={{ height: "320vh" }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1fr_26rem] lg:gap-20">
            <div>
              <p className="reveal text-base font-semibold text-muted-foreground">
                Offline scanning
              </p>
              <h2
                id="deadzone-heading"
                className="mt-5 font-display text-[1.7rem] font-bold leading-[1.14] tracking-[-0.015em] sm:text-[2.3rem]"
              >
                <ScanText as="span" text="No signal," className="block" />
                <ScanText as="span" text="no problem." gradient delay={0.18} className="block" />
              </h2>
            </div>

            {/* The scanner in hand. Entrance lives on a wrapper: .reveal sets its
               own transition, which would otherwise replace the filter fade. */}
            <div className="reveal d2">
            <div
              className="relative rounded-[1.75rem] border border-border bg-card p-6 shadow-glow transition-[filter] duration-700 ease-[cubic-bezier(0.16,1,0.30,1)]"
              style={{ filter: offline ? "saturate(0.2)" : "none" }}
            >
              {/* Status row: signal strength plus what is happening. */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="flex items-center gap-3">
                  <span className="flex items-end gap-[3px]" aria-hidden>
                    {[0, 1, 2, 3].map((b) => (
                      <span
                        key={b}
                        className="w-1.5 rounded-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.30,1)]"
                        style={{
                          height: `${6 + b * 4}px`,
                          background:
                            b < SIGNAL[phase] ? "var(--brand-1)" : "var(--border)",
                        }}
                      />
                    ))}
                  </span>
                  <span className="text-base font-semibold">{STATUS[phase]}</span>
                </span>
                {phase === "offline" ? (
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                ) : phase === "syncing" ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-[var(--brand-1)]" />
                ) : null}
              </div>

              {/* The queue. Rows persist and turn confirmed one at a time. */}
              <ul className="mt-4 space-y-1.5">
                {QUEUE.map((q, i) => {
                  const present = i < queued;
                  const done = i < confirmed;
                  return (
                    <li
                      key={q.sku}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.30,1)]"
                      style={{
                        opacity: present ? 1 : 0,
                        transform: present ? "none" : "translateY(8px)",
                        borderColor: done
                          ? "color-mix(in oklab, var(--color-success) 40%, transparent)"
                          : "color-mix(in oklab, var(--brand-1) 30%, transparent)",
                        background: done
                          ? "color-mix(in oklab, var(--color-success) 10%, transparent)"
                          : "color-mix(in oklab, var(--brand-1) 8%, transparent)",
                      }}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
                        style={{
                          background: done
                            ? "var(--color-success)"
                            : "color-mix(in oklab, var(--brand-1) 30%, transparent)",
                        }}
                      >
                        {done ? <Check className="h-3 w-3 text-white" strokeWidth={3.5} /> : null}
                      </span>
                      <span className="mono flex-1 text-sm">{q.sku}</span>
                      <span className="mono text-sm text-muted-foreground">
                        {q.bay} · +{q.qty}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                {phase === "synced" ? (
                  <span className="font-semibold text-success">
                    6 scans landed. Nothing counted twice.
                  </span>
                ) : phase === "syncing" ? (
                  <>Sending {QUEUE.length - confirmed} of {QUEUE.length}</>
                ) : phase === "offline" ? (
                  <>Holding {queued} on the device</>
                ) : (
                  <>Ready to scan</>
                )}
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
