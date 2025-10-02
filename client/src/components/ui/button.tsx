import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden backdrop-blur-sm [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:transform hover:scale-102 hover:-translate-y-0.5 active:scale-98",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[#6b9aff] to-[#7ca5ff] text-[#0a1628] shadow-lg hover:shadow-xl hover:from-[#7ca5ff] hover:to-[#8db0ff] border border-[#6b9aff]/20 font-semibold",
        destructive:
          "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg hover:shadow-xl hover:from-red-500 hover:to-red-400 border border-red-400/20",
        outline:
          "border border-[#6b9aff]/30 bg-gradient-to-r from-[#6b9aff]/10 to-[#6b9aff]/5 backdrop-blur-sm hover:from-[#6b9aff]/20 hover:to-[#6b9aff]/10 hover:border-[#6b9aff]/50 text-white shadow-md hover:shadow-lg",
        secondary:
          "bg-gradient-to-r from-[#0f1f3a] to-[#1a2b4a] text-white shadow-lg hover:shadow-xl hover:from-[#1a2b4a] hover:to-[#253655] border border-[#6b9aff]/10",
        ghost: "hover:bg-gradient-to-r hover:from-[#6b9aff]/15 hover:to-[#6b9aff]/5 text-white hover:shadow-md",
        link: "text-[#6b9aff] underline-offset-4 hover:underline hover:text-[#7ca5ff]",
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
