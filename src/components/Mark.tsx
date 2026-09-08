/**
 * The Invems mark, inline.
 *
 * The dashboard and buyer shells were drawing a gradient circle with a letter
 * "I" in it, which is not the logo. This is the real thing: the three
 * isometric cubes from public/logo.svg, as stroke paths that inherit
 * currentColor, so it sits on any surface and takes the brand colour without a
 * second asset.
 */

const CUBES = [
  "M256 108 L320 145 L320 219 L256 256 L192 219 L192 145 Z",
  "M256 182 L256 108 M256 182 L320 219 M256 182 L192 219",
  "M188 242 L252 279 L252 353 L188 390 L124 353 L124 279 Z",
  "M188 316 L188 242 M188 316 L252 353 M188 316 L124 353",
  "M324 242 L388 279 L388 353 L324 390 L260 353 L260 279 Z",
  "M324 316 L324 242 M324 316 L388 353 M324 316 L260 353",
];

export default function Mark({
  className = "h-7 w-7",
  strokeWidth = 20,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 512 512" fill="none" className={className} aria-hidden focusable="false">
      <g
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {CUBES.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
