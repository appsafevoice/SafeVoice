import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/layout/app-shell"
import { Logo } from "@/components/ui/logo"
import { ReportButton } from "@/components/home/report-button"
import { AnnouncementsFeed } from "@/components/home/announcements-feed"
import type { Announcement, Profile } from "@/lib/supabase/types"

const defaultAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "You Are Not Alone",
    content:
      "Remember, speaking up is the first step to making things better. Your voice matters, and we are here to help.",
    type: "quote",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Confidential Reporting",
    content:
      "All reports are kept confidential and handled by trained guidance counselors. Your safety is our priority.",
    type: "reminder",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Anti-Bullying Week",
    content:
      "Join us in promoting kindness and respect. Together, we can create a safer school environment for everyone.",
    type: "announcement",
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

export default async function HomePage() {
  const supabase = await createClient()

  // Get user profile
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let profile: Profile | null = null

  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    profile = data
  }

  // Get announcements
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5)

  const displayAnnouncements = announcements && announcements.length > 0 ? announcements : defaultAnnouncements

  return (
    <AppShell>
      <div className="w-full max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 pt-2">
          <Logo size="sm" />
          <div className="text-right min-w-0">
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <p className="font-semibold text-foreground truncate">{profile?.first_name || "Student"}</p>
          </div>
        </header>

        {/* Report Button */}
        <section>
          <ReportButton />
        </section>

        {/* Announcements Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Updates & Reminders</h2>
          </div>
          <AnnouncementsFeed
            initialAnnouncements={announcements && announcements.length > 0 ? announcements : []}
            fallbackAnnouncements={defaultAnnouncements}
          />
        </section>

        {/* Motivational Section */}
        <section className="p-4 sm:p-6 bg-gradient-to-br from-primary/10 to-accent/30 rounded-2xl">
          <p className="text-center text-sm sm:text-base text-foreground/80 italic">
            {
              '"Courage is not the absence of fear, but rather the judgment that something else is more important than fear."'
            }
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">- Ambrose Redmoon</p>
        </section>
      </div>
    </AppShell>
  )
}
