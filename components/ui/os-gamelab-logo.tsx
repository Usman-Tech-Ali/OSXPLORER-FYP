import { Gamepad2 } from "lucide-react"
import { cn } from "@/components/ui/utils"

interface OSGameLabLogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  className?: string
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
}

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-10 h-10",
}

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl",
}

export function OSGameLabLogo({ size = "md", showText = false, className }: OSGameLabLogoProps) {
  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <div
        className={cn(
          "bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center os-gamelab-logo",
          sizeClasses[size],
        )}
      >
        <Gamepad2 className={cn("text-black", iconSizes[size])} />
      </div>
      {showText && (
        <span
          className={cn(
            "font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent",
            textSizes[size],
          )}
        >
          OS GameLab
        </span>
      )}
    </div>
  )
}
