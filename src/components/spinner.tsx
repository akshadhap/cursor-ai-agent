import { LoaderIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn("size-13 animate-spin text-primary", className)}
      {...props}
    />
  )
}

export function SpinnerCustom({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Spinner />
    </div>
  )
}

export default SpinnerCustom
