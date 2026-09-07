import Link from "next/link";

/** Shared footer for every public page. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-border py-9">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-full w-full object-contain" />
          </span>
          <span className="font-display text-sm font-bold tracking-tight">Invems</span>
          <span className="ml-1 text-sm text-muted-foreground">
            Built for people who run warehouses.
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
