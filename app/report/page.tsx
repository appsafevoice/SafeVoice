import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/layout/app-shell"
import { ReportForm } from "@/components/report/report-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function ReportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("is_verified").eq("id", user.id).maybeSingle()
  const reportingDisabled = profile?.is_verified !== true

  if (reportingDisabled) {
    return (
      <AppShell reportingDisabled>
        <div className="min-h-screen bg-background px-4 pb-24 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Reporting Unavailable</CardTitle>
                <CardDescription>Your account is waiting for admin verification before you can submit reports.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  An admin needs to verify your student account first. Once verified, the reporting tab and report form will be enabled automatically.
                </p>
                <Button asChild>
                  <Link href="/home">Back to Home</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell reportingDisabled={reportingDisabled}>
      <ReportForm userId={user.id} />
    </AppShell>
  )
}
