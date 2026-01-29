"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { ProfileHeader } from "./profile-header"
import { RecentReports } from "./recent-reports"
import { ProfileActions } from "./profile-actions"
import { ChangePasswordForm } from "./change-password-form"
import type { Profile, Report } from "@/lib/supabase/types"

interface ProfileViewProps {
  profile: Profile
  reports: Report[]
}

export function ProfileView({ profile, reports }: ProfileViewProps) {
  const [showChangePassword, setShowChangePassword] = useState(false)

  return (
    <AppShell>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* Header */}
        <header className="pt-2">
          <h1 className="text-xl font-bold text-foreground">My Profile</h1>
        </header>

        {showChangePassword ? (
          <ChangePasswordForm onClose={() => setShowChangePassword(false)} />
        ) : (
          <>
            <ProfileHeader profile={profile} />
            <RecentReports reports={reports} />
            <ProfileActions onChangePassword={() => setShowChangePassword(true)} />
          </>
        )}
      </div>
    </AppShell>
  )
}
