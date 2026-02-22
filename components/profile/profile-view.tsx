"use client"

import { useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { ProfileHeader } from "./profile-header"
import { ProfileActions } from "./profile-actions"
import { ChangePasswordForm } from "./change-password-form"
import type { Profile } from "@/lib/supabase/types"

interface ProfileViewProps {
  profile: Profile
}

export function ProfileView({ profile }: ProfileViewProps) {
  const [showChangePassword, setShowChangePassword] = useState(false)

  return (
    <AppShell>
      <div className="w-full max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <header className="pt-2 pb-2 sm:pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Profile</h1>
        </header>

        {showChangePassword ? (
          <div className="max-w-2xl w-full mx-auto">
            <ChangePasswordForm onClose={() => setShowChangePassword(false)} />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
            <div className="space-y-4">
              <ProfileHeader profile={profile} />
              <ProfileActions onChangePassword={() => setShowChangePassword(true)} />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
