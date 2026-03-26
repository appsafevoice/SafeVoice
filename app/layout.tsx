import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SafeVoice - Report Bullying Safely",
  description: "A safe platform for students to report bullying incidents within schools",
  generator: "v0.app",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/images/safe-voice-logo.png", type: "image/png" }],
    shortcut: "/images/safe-voice-logo.png",
    apple: "/images/safe-voice-logo.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#800000",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased min-h-screen`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
