"use client"

import React, { useEffect, useState } from "react"
import { useLoading } from "./loading-context"
import { Loader2 } from "lucide-react"

export function RouteLoader() {
  const { loading } = useLoading()
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Add a small delay before showing the loader to avoid flashing on fast navigations
  useEffect(() => {
    let t: number | undefined
    if (loading) {
      t = window.setTimeout(() => setShow(true), 120)
    } else {
      setShow(false)
    }
    return () => {
      if (t) window.clearTimeout(t)
    }
  }, [loading])

  if (!mounted || !show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex flex-col items-center gap-3 bg-white dark:bg-slate-900 p-6 rounded-md shadow-lg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm text-foreground">Loading...</span>
      </div>
    </div>
  )
}
