import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "./config"

export function createClient() {
  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      maxAge: undefined,
    },
  })
}

export const createBrowserClient = createClient
