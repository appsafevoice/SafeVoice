"use client"

import { Menu } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getAdminPositionLabel, getInitials } from "@/lib/admin"
import { AdminReportsNotificationsBell } from "./admin-reports-notifications-bell"

interface AdminNavbarProps {
  onMenuClick: () => void
  adminName: string
  adminEmail: string | null
  adminPosition?: string | null
}

export function AdminNavbar({ onMenuClick, adminName, adminEmail, adminPosition }: AdminNavbarProps) {
  const initials = getInitials(adminName) || "AD"
  const roleLabel = getAdminPositionLabel(adminPosition, adminEmail)

  return (
    <header className="sticky top-0 z-30 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
      <div className="flex items-center justify-between px-4 h-16">
        <button onClick={onMenuClick} className="lg:hidden text-slate-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 ml-auto">
          <AdminReportsNotificationsBell />

          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 bg-cyan-600">
              <AvatarFallback className="bg-cyan-600 text-white text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-white">{adminName}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
