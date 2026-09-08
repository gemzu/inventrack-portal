"use client";

/**
 * The page-to-page transition, for the whole console.
 *
 * `template.tsx` remounts on every navigation, so a plain CSS animation here
 * plays exactly once per route. Two things happen together: a slat wipes up
 * off the content column, and the content rises in behind it — the bay door
 * from the site's index, at page scale.
 *
 * The old version was a Framer opacity crossfade, chosen because a transform
 * on this wrapper would become the containing block for every `position:
 * fixed` drawer inside the dashboard and pin them to the top of the page.
 * That constraint still holds, and this respects it: the animation's final
 * keyframe is `transform: none`, so once it has played there is no transform
 * left on the element at all. Framer's inline `translateY(0)` was the actual
 * hazard, and it is gone.
 */

import type { ReactNode } from "react";

export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <span className="bay-wipe" aria-hidden />
      <div className="bay-in">{children}</div>
    </div>
  );
}
