/**
 * Branded full-page loader. A crisp vector spinner ring sweeps around the
 * INVENTRACK cube mark. Everything is SVG/vector and the only animation is a
 * single smooth rotate (plus a subtle opacity pulse), so it stays sharp and
 * buttery on every screen - no scaling, no edge shimmer.
 */
export default function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-7 bg-background">
      <div className="relative w-24 h-24">
        {/* Spinner ring (rotates) */}
        <svg className="loader-spin absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="45" stroke="var(--border)" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="45"
            stroke="var(--primary)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray="70 220"
          />
        </svg>

        {/* Cube mark (static, crisp vector) */}
        <div className="absolute inset-2.5 rounded-2xl bg-[#0e0e0e] flex items-center justify-center shadow-lg">
          <svg width="46" height="46" viewBox="0 0 512 512" className="loader-fade" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="#EFEBDD" strokeWidth="18" strokeLinejoin="round" strokeLinecap="round" fill="none">
              <path d="M256 108 L320 145 L320 219 L256 256 L192 219 L192 145 Z" />
              <path d="M256 182 L256 108 M256 182 L320 219 M256 182 L192 219" />
              <path d="M188 242 L252 279 L252 353 L188 390 L124 353 L124 279 Z" />
              <path d="M188 316 L188 242 M188 316 L252 353 M188 316 L124 353" />
              <path d="M324 242 L388 279 L388 353 L324 390 L260 353 L260 279 Z" />
              <path d="M324 316 L324 242 M324 316 L388 353 M324 316 L260 353" />
            </g>
          </svg>
        </div>
      </div>

      <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground loader-fade">
        {label}
      </p>
    </div>
  );
}
