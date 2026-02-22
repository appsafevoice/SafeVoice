"use client"

import Link from "next/link"
import { Shield } from "lucide-react"

export function ReportButton() {
  return (
    <Link
      href="/report"
      className="block w-full p-4 sm:p-6 bg-primary text-primary-foreground rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="p-2.5 sm:p-3 bg-primary-foreground/20 rounded-xl">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-bold">Report an Incident</h2>
          <p className="text-xs sm:text-sm opacity-90 mt-1">Speak up safely and confidentially</p>
        </div>
        <svg className="w-5 h-5 sm:w-6 sm:h-6 opacity-80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
