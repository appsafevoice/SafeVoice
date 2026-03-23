import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { normalizeEmail } from "@/lib/admin"

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const userEmail = normalizeEmail(user.email)
    const { data: adminAccount, error: adminError } = await supabase
      .from("admin_accounts")
      .select("email")
      .eq("email", userEmail)
      .eq("is_active", true)
      .maybeSingle()

    const isAdmin = !adminError ? Boolean(adminAccount) : false

    redirect(isAdmin ? "/admin/dashboard" : "/home")
  } else {
    redirect("/login")
  }
}
