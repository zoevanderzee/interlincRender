import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden backdrop-blur-sm [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:transform hover:scale-102 hover:-translate-y-0.5 active:scale-98",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-white to-gray-100 text-black shadow-lg hover:shadow-xl hover:from-gray-50 hover:to-white border border-white/10",
        destructive:
          "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg hover:shadow-xl hover:from-red-500 hover:to-red-400 border border-red-400/20",
        outline:
          "border border-white/20 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm hover:from-white/10 hover:to-white/15 hover:border-white/30 text-white shadow-md hover:shadow-lg",
        secondary:
          "bg-gradient-to-r from-gray-700 to-gray-600 text-white shadow-lg hover:shadow-xl hover:from-gray-600 hover:to-gray-500 border border-gray-500/20",
        ghost: "hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 text-white hover:shadow-md",
        link: "text-white underline-offset-4 hover:underline hover:text-white/80",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
