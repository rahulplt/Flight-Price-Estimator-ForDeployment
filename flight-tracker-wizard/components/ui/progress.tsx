import * as React from "react"

import { cn } from "@/lib/utils"

export interface ProgressProps extends React.HTMLAttributes<HTMLProgressElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLProgressElement, ProgressProps>(({ className, value, max, ...props }, ref) => {
  return (
    <progress
      ref={ref}
      className={cn(
        "h-2 w-full appearance-none overflow-hidden rounded-full bg-secondary",
        "dark:bg-secondary/50",
        className,
      )}
      value={value}
      max={max}
      {...props}
    />
  )
})
Progress.displayName = "Progress"

export { Progress }

