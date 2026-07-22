"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"

type LoadingContextType = {
  loading: boolean
  setLoading: (v: boolean) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const anchor = target.closest("a") as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href) return

      // Ignore anchors that don't perform internal navigation
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return
      if (anchor.target && anchor.target !== "_self") return
      if (href.startsWith("http") && !href.startsWith(location.origin)) return

      // Show loader for internal navigations
      setLoading(true)
    }

    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  // When pathname changes, navigation finished — hide loader
  useEffect(() => {
    setLoading(false)
  }, [pathname])

  return <LoadingContext.Provider value={{ loading, setLoading }}>{children}</LoadingContext.Provider>
}

export function useLoading() {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error("useLoading must be used inside LoadingProvider")
  return ctx
}
