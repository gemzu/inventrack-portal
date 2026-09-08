/**
 * BOOT GATE — the page arrives the way the index does.
 *
 * The header's index opens as a bay door: layered slats moving in sequence on
 * ease-in-out-q. First load uses that identical gesture, so the very first
 * thing a visitor sees is already the site's motion language.
 *
 * The mark draws itself first, cube by cube, using the logo's real paths with
 * pathLength normalised to 1 so the stroke reveals evenly whatever its true
 * length. Then the door lifts.
 *
 * There is no React state here, and deliberately no "use client".
 *
 * It used to be a client component that started as null and mounted the gate
 * from an effect. That meant the server sent the page with no gate on it at
 * all: the browser painted the hero, hydration ran, and only then did the door
 * drop over the top — so you saw the headline flash past before the logo
 * reveal, which is the one thing a boot gate exists to prevent. No effect can
 * beat first paint, so the decision cannot live in one.
 *
 * Instead the markup is always in the HTML and starts hidden, BootScript (the
 * first thing in <body>) sets data-boot on <html> synchronously before any of
 * this is parsed, and the CSS does the rest. Shown once per session: a gate on
 * every navigation stops being an entrance and becomes an obstacle.
 */

/* Straight from public/logo.svg. Order is draw order: top crate, then the
   two it rests on. */
const CUBES = [
  [
    "M256 108 L320 145 L320 219 L256 256 L192 219 L192 145 Z",
    "M256 182 L256 108 M256 182 L320 219 M256 182 L192 219",
  ],
  [
    "M188 242 L252 279 L252 353 L188 390 L124 353 L124 279 Z",
    "M188 316 L188 242 M188 316 L252 353 M188 316 L124 353",
  ],
  [
    "M324 242 L388 279 L388 353 L324 390 L260 353 L260 279 Z",
    "M324 316 L324 242 M324 316 L388 353 M324 316 L260 353",
  ],
];

export default function BootGate() {
  return (
    <div className="boot-gate" aria-hidden>
      {/* Same three slats as the index door. */}
      <span className="boot-slat" />
      <span className="boot-slat" />
      <span className="boot-slat" />

      <div className="boot-mark">
        <svg viewBox="0 0 512 512" fill="none" className="h-28 w-28 sm:h-32 sm:w-32">
          <g
            className="boot-draw"
            stroke="var(--brand-2)"
            strokeWidth={14}
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            {CUBES.map((cube, c) =>
              cube.map((d, p) => (
                <path
                  key={`${c}-${p}`}
                  d={d}
                  pathLength={1}
                  style={{ animationDelay: `${c * 0.17 + p * 0.09}s` }}
                />
              ))
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
