"use client"

import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Home, FileText, BarChart3, Upload, UserCog, ShieldCheck, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/client"
import { getAdminPositionLabel, isSuperAdminEmail } from "@/lib/admin"

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
  adminEmail: string | null
  adminPosition?: string | null
}

const baseNavItems = [
  { href: "/admin/dashboard", label: "Home", icon: Home },
  { href: "/admin/reports", label: "Report Details", icon: FileText },
  { href: "/admin/analytics", label: "Data Reports", icon: BarChart3 },
  { href: "/admin/content", label: "Content Manager", icon: Upload },
  { href: "/admin/account-management", label: "Account Management", icon: UserCog },
]

export function AdminSidebar({ open, onClose, adminEmail, adminPosition }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient()
  const isSuperAdmin = isSuperAdminEmail(adminEmail)
  const roleLabel = getAdminPositionLabel(adminPosition, adminEmail)
  const navItems = isSuperAdmin
    ? [...baseNavItems, { href: "/admin/admin-accounts", label: "Admin Accounts", icon: ShieldCheck }]
    : baseNavItems

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "admin-chrome fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#02528a] via-[#01416a] to-[#003f62] border-r border-[#01416a] shadow-lg shadow-[#02528a]/10 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Image
                  src="/images/safe-voice-logo.png"
                  alt="SafeVoice logo"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
              </div>
              <div className="flex flex-col justify-center">
                <h2 className="font-semibold text-white/95">SafeVoice</h2>
                <p className="text-xs text-white/70">{roleLabel}</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white/95">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive ? "bg-white/14 text-white/95" : "text-white/80 hover:bg-white/10 hover:text-white/95",
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 !text-white/95 hover:!text-white hover:bg-white/10"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
