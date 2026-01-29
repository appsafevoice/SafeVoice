import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ReportForm } from "@/components/report/report-form"

export default async function ReportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return <ReportForm userId={user.id} />
}
