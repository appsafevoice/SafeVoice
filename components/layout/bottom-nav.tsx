"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, User, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/report", label: "Report", icon: FileText },
  { href: "/profile/reports", label: "Reports", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
]

interface BottomNavProps {
  reportingDisabled?: boolean
}

export function BottomNav({ reportingDisabled = false }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isReportItem = item.href === "/report"
          const isDisabled = isReportItem && reportingDisabled
          const isActive =
            item.href === "/profile"
              ? pathname === "/profile"
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

          const className = cn(
            "flex flex-col items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-colors min-w-[64px]",
            isDisabled
              ? "cursor-not-allowed text-muted-foreground/40"
              : isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
          )

          if (isDisabled) {
            return (
              <div key={item.href} className={className} aria-disabled="true" title="Your account is waiting for admin verification.">
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            )
          }

          return (
            <Link key={item.href} href={item.href} className={className}>
              <item.icon className={cn("w-5 h-5", isActive && "fill-primary/20")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
