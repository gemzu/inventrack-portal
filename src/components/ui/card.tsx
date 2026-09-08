import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card, rebuilt as the console's panel.
 *
 * Thirty screens import this, so the fastest honest way to change what the
 * dashboard looks like was to change what a card *is* rather than to edit
 * thirty files into a different shape. The API is untouched; the surface is
 * the site's: a hairline box with one edge that can light, no blur, no drop
 * shadow, and a radius small enough to read as machined rather than soft.
 *
 * Footers no longer get a filled grey bar. On the site, a section ends with a
 * rule, so that is what a footer is here.
 */

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "panel group/card flex flex-col gap-4 py-5 text-sm text-card-foreground",
        "data-[size=sm]:gap-3 data-[size=sm]:py-4",
        "has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 px-5 group-data-[size=sm]/card:px-4",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        "[.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-display text-[15px] font-bold leading-snug tracking-[-0.015em] group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

/* Descriptions are the one place a card should be quiet, so they take the mono
   caption treatment the rest of the console uses for secondary lines. */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 group-data-[size=sm]/card:px-4", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "mt-1 flex items-center border-t border-border px-5 py-4 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:py-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
