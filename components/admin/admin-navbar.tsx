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
    <header className="admin-chrome sticky top-0 z-30 bg-[#800000]/95 backdrop-blur-sm border-b border-[#6a0000]">
      <div className="flex items-center justify-between px-4 h-16">
        <button onClick={onMenuClick} className="lg:hidden text-white/70 hover:text-white/95">
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 ml-auto">
          <AdminReportsNotificationsBell />

          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 bg-white/15 border border-white/10">
              <AvatarFallback className="bg-white/15 text-white/95 text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-white/95">{adminName}</p>
              <p className="text-xs text-white/70">{roleLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
