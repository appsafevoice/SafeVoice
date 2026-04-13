"use client"

import { useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"

const TAB_TRACK_KEY = "safevoice-active-tabs"
const TAB_ID_KEY = "safevoice-tab-id"

function getActiveTabIds() {
  if (typeof window === "undefined") return []

  try {
    return JSON.parse(window.localStorage.getItem(TAB_TRACK_KEY) || "[]") as string[]
  } catch {
    return []
  }
}

function setActiveTabIds(ids: string[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TAB_TRACK_KEY, JSON.stringify(ids))
}

function generateTabId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function AutoLogoutOnClose() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const supabase = createBrowserClient()
    const previousTabs = getActiveTabIds()
    const currentTabId = window.sessionStorage.getItem(TAB_ID_KEY) || generateTabId()
    window.sessionStorage.setItem(TAB_ID_KEY, currentTabId)

    const newTabs = Array.from(new Set([...previousTabs, currentTabId]))
    setActiveTabIds(newTabs)

    const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    const navType = navigationEntries[0]?.type || "navigate"

    const shouldLogoutOnOpen = navType === "navigate" && previousTabs.length === 0

    const signOutIfNeeded = async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session && shouldLogoutOnOpen) {
        await supabase.auth.signOut()
      }
    }

    void signOutIfNeeded()

    const removeCurrentTab = () => {
      const activeTabs = getActiveTabIds().filter((id) => id !== currentTabId)
      setActiveTabIds(activeTabs)
    }

    window.addEventListener("beforeunload", removeCurrentTab)
    window.addEventListener("pagehide", removeCurrentTab)

    return () => {
      window.removeEventListener("beforeunload", removeCurrentTab)
      window.removeEventListener("pagehide", removeCurrentTab)
      removeCurrentTab()
    }
  }, [])

  return null
}
