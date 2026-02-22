import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdypkxuhvdaetskceokv.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkeXBreHVodmRhZXRza2Nlb2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzM0MzUsImV4cCI6MjA3OTc0OTQzNX0.pRjHBjSBlXEELWb8xdUvO21F0H4nD8eJ75CpmdCP9x0",
  )
}

export const createBrowserClient = createClient
