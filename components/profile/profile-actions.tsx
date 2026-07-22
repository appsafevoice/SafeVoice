"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Key, LogOut, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent min-h-10"
              disabled={loggingOut}
            >
              {loggingOut ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <LogOut className="w-4 h-4 mr-3" />}
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-background border border-slate-200 p-6">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to sign out? You can log back in anytime with your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-300 bg-white text-slate-950 hover:bg-slate-100">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Confirm Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
