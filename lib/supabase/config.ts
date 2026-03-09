function readEnv(name: string) {
  const raw = process.env[name]
  if (!raw) return ""
  return raw.trim().replace(/^['"]|['"]$/g, "")
}

function readFirstEnv(names: string[]) {
  for (const name of names) {
    const value = readEnv(name)
    if (value) return value
  }
  return ""
}

const supabaseUrl = readFirstEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"])
const supabaseAnonKey = readFirstEnv(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"])
const fallbackUrl = "https://ocicgncelxteqlzzuikz.supabase.co"
const fallbackAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaWNnbmNlbHh0ZXFsenp1aWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NDI5OTgsImV4cCI6MjA4ODUxODk5OH0.eWrXaCVXnDRZhVpFoeyDwdYt3aR2GTxZGVISDDwfDZ8"
const resolvedSupabaseUrl = supabaseUrl || fallbackUrl
const resolvedSupabaseAnonKey = supabaseAnonKey || fallbackAnonKey

if (!/^https?:\/\//i.test(resolvedSupabaseUrl)) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is invalid. Use your full project URL, for example: https://your-project-ref.supabase.co",
  )
}

export { resolvedSupabaseUrl as supabaseUrl, resolvedSupabaseAnonKey as supabaseAnonKey }
