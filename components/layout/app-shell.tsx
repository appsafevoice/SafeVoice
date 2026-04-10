"use client"

import type { ReactNode } from "react"
import { BottomNav } from "./bottom-nav"

interface AppShellProps {
  children: ReactNode
  reportingDisabled?: boolean
}

export function AppShell({ children, reportingDisabled = false }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20 overflow-y-auto hide-scrollbar">{children}</main>
      <BottomNav reportingDisabled={reportingDisabled} />
    </div>
  )
}
