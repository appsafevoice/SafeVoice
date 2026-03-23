import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { createClient } from "@/lib/supabase/server"
import { normalizeEmail } from "@/lib/admin"
import { redirect } from "next/navigation"

export default async function ForgotPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    const userEmail = normalizeEmail(user.email)
    const { data: adminAccount, error: adminError } = await supabase
      .from("admin_accounts")
      .select("email")
      .eq("email", userEmail)
      .eq("is_active", true)
      .maybeSingle()

    const isAdmin = !adminError ? Boolean(adminAccount) : false
    redirect(isAdmin ? "/admin/dashboard" : "/home")
  }

  return <ForgotPasswordForm />
}
