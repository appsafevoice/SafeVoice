"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Share2, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const DISMISS_STORAGE_KEY = "safevoice-add-to-home-dismissed-at"
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 3

function isIosDevice() {
  if (typeof window === "undefined") return false

  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent) || (userAgent.includes("mac") && window.navigator.maxTouchPoints > 1)
}

function isAndroidDevice() {
  if (typeof window === "undefined") return false
  return /android/.test(window.navigator.userAgent.toLowerCase())
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(navigatorWithStandalone.standalone)
}

export function AddToHomeScreenPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [showIosSteps, setShowIosSteps] = useState(false)
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other")

  const isIos = platform === "ios"
  const isAndroid = platform === "android"

  const promptLabel = useMemo(() => {
    if (isIos) return showIosSteps ? "Got it" : "Show steps"
    return "Add now"
  }, [isIos, showIosSteps])

  useEffect(() => {
    if (typeof window === "undefined") return

    const standalone = isStandaloneMode()
    const detectedPlatform = isIosDevice() ? "ios" : isAndroidDevice() ? "android" : "other"
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_STORAGE_KEY) || "0")
    const isDismissedRecently = dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DURATION_MS

    setPlatform(detectedPlatform)

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined)
    }

    if (standalone || isDismissedRecently || detectedPlatform === "other") {
      return
    }

    let iosTimer: ReturnType<typeof setTimeout> | null = null

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent
      installEvent.preventDefault()
      setDeferredPrompt(installEvent)

      if (detectedPlatform === "android") {
        setIsVisible(true)
      }
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsVisible(false)
      setShowIosSteps(false)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    if (detectedPlatform === "ios") {
      iosTimer = setTimeout(() => {
        setIsVisible(true)
      }, 1500)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  const dismissPrompt = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString())
    }

    setIsVisible(false)
    setShowIosSteps(false)
  }

  const handleInstall = async () => {
    if (isIos) {
      if (showIosSteps) {
        dismissPrompt()
      } else {
        setShowIosSteps(true)
      }
      return
    }

    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)

    if (choice.outcome === "accepted") {
      setIsVisible(false)
      return
    }

    dismissPrompt()
  }

  if (!isVisible) return null

  if (isAndroid && !deferredPrompt) return null

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex justify-center sm:justify-end">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[#007cce]/15 bg-white/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-[#007cce]/10 p-2 text-[#007cce]">
            {isIos ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Add SafeVoice to your home screen</p>
                <p className="mt-1 text-sm text-slate-600">
                  {isIos
                    ? "Install SafeVoice for quicker access and a more app-like experience."
                    : "Install SafeVoice for quicker access and a full-screen app experience."}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissPrompt}
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Dismiss add to home screen prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIos && showIosSteps ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p>1. Tap the Share button in Safari.</p>
                <p>2. Choose Add to Home Screen.</p>
                <p>3. Tap Add.</p>
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={dismissPrompt}>
                Not now
              </Button>
              <Button type="button" className="bg-[#007cce] hover:bg-[#005a99]" onClick={handleInstall}>
                {promptLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
