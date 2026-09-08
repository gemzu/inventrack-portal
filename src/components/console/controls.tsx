"use client";

/**
 * The console's controls.
 *
 * Every screen had been writing its own input: the same twelve utility classes
 * copied around, at three different radii, with focus rings that did not agree
 * with each other. That is why the working screens felt assembled rather than
 * designed.
 *
 * These are the site's: hairline, square-ish, and the focus state is the brand
 * edge lighting rather than a fat translucent ring. Labels are sentence case in
 * the body face — they are read, not announced.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown, Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD =
  "w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none " +
  "transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)] " +
  "placeholder:text-muted-foreground focus:border-[var(--brand-2)] " +
  "focus:shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-2)_60%,transparent)]";

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[12px] text-muted-foreground"
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  children,
  className,
  hint,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(FIELD, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(FIELD, "resize-y", className)} {...props} />;
}

/* Selects keep their own chevron, because the native one is drawn by the OS
   and refuses to match anything else on the screen. */
export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(FIELD, "cursor-pointer appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

/* Search is a line you type on with a glyph, not a pill. */
export function SearchInput({
  className,
  onClear,
  ...props
}: React.ComponentProps<"input"> & { onClear?: () => void }) {
  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input className={cn(FIELD, "pl-9", props.value ? "pr-9" : "")} {...props} />
      {props.value && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-300 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/* ── Segmented control ─────────────────────────────────────────
   The old view switcher was a Framer layoutId sliding a filled
   violet pill. This is the rail's gesture instead: the live option
   carries the lit hairline under it. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end gap-6 border-b border-border", className)} role="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative -mb-px pb-2.5 text-[13px] font-semibold transition-colors duration-300",
              on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-px origin-left bg-[linear-gradient(to_right,var(--brand-1),var(--brand-3))]",
                "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.30,1)]",
                on ? "scale-x-100" : "scale-x-0"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ── Chips ─────────────────────────────────────────────────────
   Filters read as a row of switches, not as filled capsules. */
export function Chip({
  on,
  children,
  ...props
}: { on?: boolean } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "rounded-md border px-3 py-1.5 text-[12px] transition-[border-color,color,background-color] duration-300",
        on
          ? "border-[var(--brand-2)] bg-[color-mix(in_oklab,var(--brand-2)_12%,transparent)] text-foreground"
          : "border-border text-muted-foreground hover:border-[var(--brand-2)] hover:text-foreground",
        props.className
      )}
    >
      {children}
    </button>
  );
}

/* ── Buttons ───────────────────────────────────────────────────
   Two weights. Solid for the one action a screen exists for,
   hairline for everything else. */
export function Action({
  children,
  solid = false,
  ...props
}: { solid?: boolean } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold",
        "transition-[transform,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.16,1,0.30,1)]",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0",
        solid
          ? "bg-primary text-primary-foreground shadow-[var(--btn-shadow)] hover:-translate-y-0.5 hover:bg-primary-dark"
          : "border border-border hover:-translate-y-0.5 hover:border-[var(--brand-2)] hover:text-[var(--brand-2)]",
        props.className
      )}
    >
      {children}
    </button>
  );
}

/* ── Drawer ────────────────────────────────────────────────────
   Detail slides in as a bay door on its side: one slat, then the
   panel. CSS only, so it moves on the same curve as the rest of
   the site rather than on a spring from a different system. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="drawer-scrim absolute inset-0 bg-[color-mix(in_oklab,var(--background)_72%,transparent)] backdrop-blur-sm"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className="drawer-panel relative flex h-full w-full max-w-md flex-col border-l border-border bg-background"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h3 className="font-display truncate text-[15px] font-bold tracking-[-0.015em]">{title}</h3>
            {subtitle ? (
              <p className="truncate text-[12px] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-muted-foreground transition-colors duration-300 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer ? (
          <footer className="flex shrink-0 items-center gap-3 border-t border-border px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/* ── Modal ─────────────────────────────────────────────────────
   Centre-screen work: imports, confirmations. Same panel, same
   entrance as everything else. */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="drawer-scrim absolute inset-0 bg-[color-mix(in_oklab,var(--background)_72%,transparent)] backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "modal-panel panel panel-live relative flex max-h-[86vh] w-full flex-col bg-card",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h3 className="font-display truncate text-[15px] font-bold tracking-[-0.015em]">{title}</h3>
            {subtitle ? (
              <p className="truncate text-[12px] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-muted-foreground transition-colors duration-300 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
