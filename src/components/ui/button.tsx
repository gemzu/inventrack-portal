"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none select-none focus-visible:border-[var(--brand-2)] focus-visible:shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-2)_60%,transparent)] motion-safe:active:not-aria-[haspopup]:scale-[0.97] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-100 disabled:saturate-75 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:transition-transform [&_svg]:duration-200",
  {
    variants: {
      variant: {
default:
          "border-transparent bg-primary text-primary-foreground shadow-[var(--btn-shadow)] hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-40",
        brand:
          "border-transparent bg-primary text-primary-foreground shadow-[var(--btn-shadow)] hover:-translate-y-0.5 hover:bg-primary-dark",
        outline:
          "border-border bg-transparent hover:-translate-y-0.5 hover:border-[var(--brand-2)] hover:text-[var(--brand-2)] aria-expanded:border-[var(--brand-2)] disabled:text-muted-foreground",
        secondary:
          "bg-secondary text-foreground hover:bg-muted",
        ghost:
          "hover:bg-secondary hover:text-foreground aria-expanded:bg-secondary aria-expanded:text-foreground disabled:text-muted-foreground",
        destructive:
          "bg-destructive text-white border-transparent hover:-translate-y-0.5 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 disabled:bg-destructive/45 disabled:text-white/85",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-7 gap-1 rounded-sm px-2.5 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-md px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-6 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-9",
        "icon-xs":
          "size-7 rounded-md in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-md in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
