"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Key, LogOut, Loader2 } from "lucide-react"

interface ProfileActionsProps {
  onChangePassword: () => void
}

export function ProfileActions({ onChangePassword }: ProfileActionsProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 sm:p-5 space-y-2">
        <Button variant="outline" className="w-full justify-start bg-transparent min-h-10" onClick={onChangePassword}>
          <Key className="w-4 h-4 mr-3" />
          Change Password
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent min-h-10"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <LogOut className="w-4 h-4 mr-3" />}
          {loggingOut ? "Logging out..." : "Logout"}
        </Button>
      </CardContent>
    </Card>
  )
}
