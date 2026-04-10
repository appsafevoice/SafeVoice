"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getAttachmentKind } from "@/lib/report-media"

interface ReportMediaGridProps {
  attachments: string[]
  className?: string
  emptyMessage?: string
  itemLabelPrefix?: string
  onRemove?: (url: string) => void
  variant?: "default" | "dark"
}

export function ReportMediaGrid({
  attachments,
  className,
  emptyMessage = "No attachments available.",
  itemLabelPrefix = "Attachment",
  onRemove,
  variant = "default",
}: ReportMediaGridProps) {
  const isDark = variant === "dark"

  if (attachments.length === 0) {
    return <p className={cn("text-sm", isDark ? "text-slate-400" : "text-muted-foreground", className)}>{emptyMessage}</p>
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {attachments.map((url, index) => {
        const kind = getAttachmentKind(url)

        return (
          <div
            key={`${url}-${index}`}
            className={cn(
              "overflow-hidden rounded-lg border",
              isDark ? "border-slate-600 bg-slate-700/30" : "border-border bg-muted/40",
            )}
          >
            {kind === "image" ? (
              <img src={url} alt={`${itemLabelPrefix} ${index + 1}`} className="h-44 w-full bg-slate-900 object-cover" />
            ) : kind === "video" ? (
              <video src={url} controls className="h-44 w-full bg-slate-900" preload="metadata" />
            ) : kind === "audio" ? (
              <div className="flex h-44 items-center justify-center bg-slate-900 px-4">
                <audio src={url} controls className="w-full" preload="metadata" />
              </div>
            ) : (
              <div
                className={cn(
                  "flex h-44 items-center justify-center px-4 text-center text-sm",
                  isDark ? "bg-slate-900 text-slate-300" : "bg-muted text-muted-foreground",
                )}
              >
                Preview unavailable for this file type
              </div>
            )}

            <div className="flex items-center justify-between gap-2 p-2">
              <span className={cn("text-xs", isDark ? "text-slate-300" : "text-muted-foreground")}>
                {itemLabelPrefix} {index + 1}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "rounded px-2.5 py-1 text-xs transition-colors",
                    isDark ? "bg-slate-700 text-cyan-300 hover:bg-slate-600" : "bg-background text-primary hover:bg-accent",
                  )}
                >
                  Open
                </a>
                <a
                  href={url}
                  download
                  className={cn(
                    "rounded px-2.5 py-1 text-xs transition-colors",
                    isDark ? "bg-slate-700 text-cyan-300 hover:bg-slate-600" : "bg-background text-primary hover:bg-accent",
                  )}
                >
                  Download
                </a>
                {onRemove ? (
                  <button
                    type="button"
                    onClick={() => onRemove(url)}
                    className={cn(
                      "rounded p-1 transition-colors",
                      isDark ? "bg-slate-700 text-slate-200 hover:bg-red-500/80" : "bg-background text-muted-foreground hover:bg-destructive hover:text-white",
                    )}
                    aria-label={`Remove ${itemLabelPrefix.toLowerCase()} ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
