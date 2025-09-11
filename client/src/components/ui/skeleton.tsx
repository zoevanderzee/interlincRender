import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton rounded-lg bg-gradient-to-r from-white/5 to-white/10 animate-shimmer",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
