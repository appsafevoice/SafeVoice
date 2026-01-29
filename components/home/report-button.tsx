"use client"

import Link from "next/link"
import { Shield } from "lucide-react"

export function ReportButton() {
  return (
    <Link
      href="/report"
      className="block w-full p-6 bg-primary text-primary-foreground rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary-foreground/20 rounded-xl">
          <Shield className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Report an Incident</h2>
          <p className="text-sm opacity-90 mt-1">Speak up safely and confidentially</p>
        </div>
        <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
