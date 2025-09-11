import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "badge inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-md hover:shadow-lg transform hover:scale-105",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-white/10 to-white/20 text-white border border-white/20 hover:from-white/20 hover:to-white/30 hover:border-white/30",
        secondary:
          "bg-gradient-to-r from-gray-600/50 to-gray-500/50 text-white border border-gray-400/20 hover:from-gray-500/60 hover:to-gray-400/60",
        destructive:
          "bg-gradient-to-r from-red-600/80 to-red-500/80 text-white border border-red-400/30 hover:from-red-500/90 hover:to-red-400/90",
        success:
          "bg-gradient-to-r from-green-600/80 to-green-500/80 text-white border border-green-400/30 hover:from-green-500/90 hover:to-green-400/90",
        warning:
          "bg-gradient-to-r from-yellow-600/80 to-yellow-500/80 text-white border border-yellow-400/30 hover:from-yellow-500/90 hover:to-yellow-400/90",
        info:
          "bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white border border-blue-400/30 hover:from-blue-500/90 hover:to-blue-400/90",
        outline: "border border-white/30 text-white bg-transparent hover:bg-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
