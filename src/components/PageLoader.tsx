/**
 * Branded full-page loader. Shows the INVENTRACK cube mark with a soft breathing
 * motion, two pulsing rings, and a slim indeterminate progress bar. Replaces the
 * bare gray spinner on the dashboard auth gate.
 */
export default function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-background">
      <div className="relative flex items-center justify-center">
        {/* Pulsing rings behind the mark */}
        <span className="loader-ring absolute w-20 h-20 rounded-3xl border border-primary/30" />
        <span className="loader-ring loader-ring-2 absolute w-20 h-20 rounded-3xl border border-primary/30" />

        {/* The cube mark */}
        <div className="loader-logo relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg ring-1 ring-foreground/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="INVENTRACK" className="w-full h-full" />
        </div>
      </div>

      {/* Indeterminate progress bar */}
      <div className="w-44 h-1 rounded-full bg-foreground/10 overflow-hidden">
        <div className="loader-bar h-full w-1/3 rounded-full bg-primary" />
      </div>

      <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
