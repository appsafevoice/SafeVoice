import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/layout/app-shell"
import { RecentReports } from "@/components/profile/recent-reports"

export default async function ProfileReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <AppShell>
      <div className="w-full max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center gap-3 pt-2 pb-3 sm:pb-4">
          <Link href="/profile" className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Recent Reports</h1>
        </header>
        <div className="max-w-3xl mx-auto">
          <RecentReports reports={reports || []} />
        </div>
      </div>
    </AppShell>
  )
}
