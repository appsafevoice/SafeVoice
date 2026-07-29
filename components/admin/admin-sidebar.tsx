"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Home, FileText, BarChart3, Upload, UserCog, ShieldCheck, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { createBrowserClient } from "@/lib/supabase/client"
import { getAdminPositionLabel, isSuperAdminEmail } from "@/lib/admin"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
  const [loggingOut, setLoggingOut] = useState(false)
  const isSuperAdmin = isSuperAdminEmail(adminEmail)
  const roleLabel = getAdminPositionLabel(adminPosition, adminEmail)
  const navItems = isSuperAdmin
    ? [...baseNavItems, { href: "/admin/admin-accounts", label: "Admin Accounts", icon: ShieldCheck }]
    : baseNavItems

  const handleLogout = async () => {
    setLoggingOut(true)
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
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center">
                  <Logo size="lg" showText={false} />
                </div>
                <div className="flex flex-col justify-center">
                  <h2 className="font-semibold text-white/95">SafeVoice</h2>
                  <p className="text-xs text-white/70">{roleLabel}</p>
                </div>
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 !text-white/95 hover:!text-white hover:bg-white/10"
                  disabled={loggingOut}
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border border-slate-700 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to log out? You will need to sign in again to access the admin dashboard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500/40"
                  >
                    Confirm Logout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </aside>
    </>
  )
}
