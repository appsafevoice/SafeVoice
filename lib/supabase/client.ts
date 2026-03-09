import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "./config"

export function createClient() {
  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey)
}

export const createBrowserClient = createClient
