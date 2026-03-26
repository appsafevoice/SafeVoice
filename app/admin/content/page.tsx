"use client"

import { Suspense } from "react"
import AdminContentClient from "./content-client"

export default function AdminContentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
        </div>
      }
    >
      <AdminContentClient />
    </Suspense>
  )
}
