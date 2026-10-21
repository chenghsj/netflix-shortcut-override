import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const raisedButtonMotion = cn(
  "hover:shadow-[5px_5px_0_0_var(--shadow-color)] focus-visible:shadow-[5px_5px_0_0_var(--shadow-color)]",
  "motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 motion-safe:focus-visible:-translate-x-0.5 motion-safe:focus-visible:-translate-y-0.5",
  "motion-safe:active:translate-x-[3px] motion-safe:active:translate-y-[3px] active:shadow-none",
  "motion-safe:[&_[data-icon=inline-start]]:transition-transform motion-safe:[&_[data-icon=inline-start]]:duration-150",
  "motion-safe:hover:[&_[data-icon=inline-start]]:-rotate-6 motion-safe:focus-visible:[&_[data-icon=inline-start]]:-rotate-6 motion-safe:active:[&_[data-icon=inline-start]]:rotate-0"
)

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border-2 border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-[background-color,color,box-shadow,translate] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: [
          "border-border bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
          raisedButtonMotion,
        ],
        outline: [
          "border-border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
          raisedButtonMotion,
        ],
        secondary: [
          "border-border bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
          raisedButtonMotion,
        ],
        ghost:
          "hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        destructive: [
          "border-destructive bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/20 focus-visible:border-destructive focus-visible:ring-destructive/40",
          raisedButtonMotion,
        ],
        link: "text-foreground underline decoration-2 underline-offset-4 hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
