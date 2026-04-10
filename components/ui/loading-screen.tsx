"use client"

import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface LoadingScreenProps {
  title: string
  description: string
  progress?: number
  mode?: "page" | "overlay"
  className?: string
}

export function LoadingScreen({
  title,
  description,
  progress = 35,
  mode = "page",
  className,
}: LoadingScreenProps) {
  const progressValue = Math.max(0, Math.min(100, progress))
  const isOverlay = mode === "overlay"

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        isOverlay
          ? "fixed inset-0 z-50 flex items-center justify-center bg-[#531313]/10 px-4 backdrop-blur-sm"
          : "flex min-h-[50vh] items-center justify-center px-4 py-10",
        className,
      )}
    >
      <div className="w-full max-w-md rounded-3xl border border-[#e7cfcf] bg-white/95 p-6 shadow-[0_24px_80px_rgba(83,19,19,0.16)]">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#007cce]/10 text-[#007cce]">
            <Spinner className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[#531313]">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-[#8f6060]">{description}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-[#8f6060]">
            <span>Progress</span>
            <span>{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>
      </div>
    </div>
  )
}
