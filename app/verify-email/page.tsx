import { redirect } from "next/navigation"
import { VerifyEmailForm } from "@/components/auth/verify-email-form"
import { normalizeEmail } from "@/lib/admin"
import { createClient } from "@/lib/supabase/server"

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string
    context?: string
  }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams
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

  const initialEmail = typeof params.email === "string" ? params.email : ""
  const context = params.context === "admin" ? "admin" : "signup"

  return <VerifyEmailForm initialEmail={initialEmail} context={context} />
}
