"use client"

import { Suspense } from "react"
import AdminContentClient from "./content-client"

export default function AdminContentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      }
    >
      <AdminContentClient />
    </Suspense>
  )
}
