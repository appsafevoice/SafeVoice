import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "./config"

export function createClient() {
  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export const createBrowserClient = createClient
