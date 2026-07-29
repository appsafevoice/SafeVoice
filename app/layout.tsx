import type React from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/react"
import { AddToHomeScreenPrompt } from "@/components/pwa/add-to-home-screen-prompt"
import { Toaster } from "@/components/ui/toaster"
import { LoadingProvider } from "@/components/ui/loading-context"
import { RouteLoader } from "@/components/ui/route-loader"
import "./globals.css"

export const metadata: Metadata = {
  title: "SafeVoice - Report Bullying Safely",
  description: "A safe platform for students to report bullying incidents within schools",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SafeVoice",
  },
  icons: {
    icon: [{ url: "/SafeVoiceLogo.png", type: "image/png", sizes: "192x192" }],
    shortcut: "/SafeVoiceLogo.png",
    apple: "/SafeVoiceLogo.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#02528a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased min-h-screen`}>
        <LoadingProvider>
          <RouteLoader />
          {children}
        </LoadingProvider>
        <AddToHomeScreenPrompt />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
