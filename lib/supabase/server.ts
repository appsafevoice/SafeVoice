import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://myrzyrimjpjwwuqbtqxn.supabase.co", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cnp5cmltanBqd3d1cWJ0cXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2ODM3NzksImV4cCI6MjA4NTI1OTc3OX0.vAuyTLTL5foUewZm9XOkJdMxnhSFsijWmfnM3WqIElY", {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Component context - can be ignored with middleware refreshing sessions
        }
      },
    },
  })
}
