import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import type { Profile } from "@/lib/supabase/types"

interface ProfileHeaderProps {
  profile: Profile
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const firstInitial = profile.first_name?.[0] || profile.email?.[0] || "U"
  const lastInitial = profile.last_name?.[0] || ""
  const initials = `${firstInitial}${lastInitial}`.toUpperCase() || "U"

  const displayName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.email?.split("@")[0] || "User"

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <div className="h-24 bg-gradient-to-br from-primary to-primary/70" />
      <CardContent className="relative pt-0 pb-6">
        <div className="flex flex-col items-center -mt-12">
          <Avatar className="w-24 h-24 border-4 border-card shadow-lg">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h2 className="mt-3 text-xl font-bold text-foreground">{displayName}</h2>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          {profile.lrn && (
            <div className="mt-2 px-3 py-1 bg-muted rounded-full">
              <span className="text-xs text-muted-foreground">LRN: {profile.lrn}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
