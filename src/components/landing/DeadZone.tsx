"use client";

/**
 * THE DEAD ZONE.
 *
 * The back of a warehouse has no signal. Most inventory tools quietly fail
 * there; Invems queues the scans and flushes them on reconnect. That is a real
 * differentiator and it was previously one bullet point, so here it is played
 * out on the scroll: coverage drops, the panel loses its colour, the queue
 * climbs, then the bars come back and the queue empties.
 *
 * Scrubbed with useScrollScrub; CSS sticky does the pinning.
 */

import { useCallback, useRef, useState } from "react";
import { Wifi, WifiOff, RefreshCw, Check } from "lucide-react";
import { useScrollScrub } from "@/components/motion/useScrollScrub";

const QUEUE = [
  "PGD1668M", "MX1473", "Z619", "TRN0442", "KLM8891",
  "QP2210", "VX7735", "HD1902", "BRT5518", "NW3067",
];

type Phase = "online" | "offline" | "syncing" | "synced";

const LABEL: Record<Phase, string> = {
  online: "Connected",
  offline: "No signal",
  syncing: "Back in range",
  synced: "All caught up",
};

export default function DeadZone() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("online");
  const [queued, setQueued] = useState(0);

  const onProgress = useCallback((p: number) => {
    if (p < 0.18) {
      setPhase("online");
      setQueued(0);
    } else if (p < 0.62) {
      setPhase("offline");
      /* Queue fills across the offline stretch. */
      const t = (p - 0.18) / (0.62 - 0.18);
      setQueued(Math.min(QUEUE.length, Math.ceil(t * QUEUE.length)));
    } else if (p < 0.84) {
      setPhase("syncing");
      const t = (p - 0.62) / (0.84 - 0.62);
      setQueued(Math.max(0, Math.ceil((1 - t) * QUEUE.length)));
    } else {
      setPhase("synced");
      setQueued(0);
    }
  }, []);

  const onReduced = useCallback(() => {
    setPhase("synced");
    setQueued(0);
  }, []);

  useScrollScrub(trackRef, onProgress, onReduced);

  const dim = phase === "offline";

  return (
    <section aria-labelledby="deadzone-heading" className="border-t border-border">
      <div ref={trackRef} className="relative" style={{ height: "300vh" }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
            {/* Label only. The demo makes the point. */}
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Offline scanning
              </p>
              <h2
                id="deadzone-heading"
                className="mt-3 font-display text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-4xl lg:text-[3rem]"
              >
                No signal,
                <br />
                <span className="text-brand-gradient">no problem.</span>
              </h2>
            </div>

            {/* The device */}
            <div
              className="relative mx-auto w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-glow transition-[filter,opacity] duration-700"
              style={{
                filter: dim ? "saturate(0.15) brightness(0.94)" : "none",
              }}
            >
              {/* Status bar */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  {phase === "offline" ? (
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                  ) : phase === "syncing" ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-[var(--brand-1)]" />
                  ) : phase === "synced" ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Wifi className="h-4 w-4 text-success" />
                  )}
                  {LABEL[phase]}
                </span>
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Bay C
                </span>
              </div>

              {/* Queue counter */}
              <div className="flex items-baseline gap-2 py-5">
                <span className="mono font-display text-5xl font-extrabold tabular-nums">
                  {queued}
                </span>
                <span className="text-sm text-muted-foreground">
                  {queued === 1 ? "scan waiting" : "scans waiting"}
                </span>
              </div>

              {/* The queue itself */}
              <div className="grid grid-cols-2 gap-1.5" aria-hidden>
                {QUEUE.map((sku, i) => {
                  const present = i < queued;
                  return (
                    <span
                      key={sku}
                      className="mono rounded-md border px-2 py-1 text-[10px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.30,1)]"
                      style={{
                        opacity: present ? 1 : 0,
                        transform: present ? "none" : "translateY(6px) scale(0.96)",
                        borderColor: present
                          ? "color-mix(in oklab, var(--brand-1) 35%, transparent)"
                          : "transparent",
                        background: present
                          ? "color-mix(in oklab, var(--brand-1) 10%, transparent)"
                          : "transparent",
                      }}
                    >
                      {sku}
                    </span>
                  );
                })}
              </div>

              {phase === "synced" && (
                <p className="mt-4 text-center text-xs font-semibold text-success">
                  10 scans synced
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
