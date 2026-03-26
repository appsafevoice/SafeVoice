"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdminSidebar } from "./admin-sidebar"
import { AdminNavbar } from "./admin-navbar"
import { createBrowserClient } from "@/lib/supabase/client"
import { DEFAULT_ADMIN_NAME, getAdminPositionLabel, isSuperAdminEmail, normalizeEmail } from "@/lib/admin"

interface AdminLayoutProps {
  children: React.ReactNode
  requireSuperAdmin?: boolean
}

export function AdminLayout({ children, requireSuperAdmin = false }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminName, setAdminName] = useState(DEFAULT_ADMIN_NAME)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [adminPosition, setAdminPosition] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add("admin-theme")

    return () => {
      document.body.classList.remove("admin-theme")
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        setIsLoading(false)
        return
      }

      const userEmail = normalizeEmail(user.email)
      const { data: adminAccount, error: adminError } = await supabase
        .from("admin_accounts")
        .select("full_name, position, is_active")
        .eq("email", userEmail)
        .eq("is_active", true)
        .maybeSingle()

      let isAdmin = false
      let adminDisplayName = user.user_metadata?.full_name?.trim() || DEFAULT_ADMIN_NAME

      if (adminError) {
        router.push("/home")
        setIsLoading(false)
        return
      }

      isAdmin = Boolean(adminAccount)
      if (adminAccount?.full_name?.trim()) {
        adminDisplayName = adminAccount.full_name.trim()
      }

      if (requireSuperAdmin && !isSuperAdminEmail(userEmail)) {
        router.push("/admin/dashboard")
        setIsLoading(false)
        return
      }

      if (!isAdmin) {
        router.push("/home")
        setIsLoading(false)
        return
      }

      setAdminName(adminDisplayName)
      setAdminEmail(userEmail)
      setAdminPosition(getAdminPositionLabel(adminAccount?.position, userEmail))
      setIsAuthenticated(true)
      setIsLoading(false)
    }

    checkAuth()
  }, [pathname, requireSuperAdmin, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="admin-theme min-h-screen bg-slate-900">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        adminEmail={adminEmail}
        adminPosition={adminPosition}
      />
      <div className="lg:pl-64">
        <AdminNavbar
          onMenuClick={() => setSidebarOpen(true)}
          adminName={adminName}
          adminEmail={adminEmail}
          adminPosition={adminPosition}
        />
        <main className="min-h-screen bg-white p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
