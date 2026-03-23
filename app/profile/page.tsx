import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileView } from "@/components/profile/profile-view"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get profile
  let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    const firstName =
      typeof user.user_metadata?.first_name === "string" && user.user_metadata.first_name.trim()
        ? user.user_metadata.first_name.trim()
        : typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name.trim().split(/\s+/)[0] || ""
          : ""
    const lastName =
      typeof user.user_metadata?.last_name === "string" && user.user_metadata.last_name.trim()
        ? user.user_metadata.last_name.trim()
        : typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().includes(" ")
          ? user.user_metadata.full_name.trim().split(/\s+/).slice(1).join(" ")
          : ""
    const lrn =
      typeof user.user_metadata?.lrn === "string" && user.user_metadata.lrn.trim()
        ? user.user_metadata.lrn.trim()
        : typeof user.user_metadata?.student_id === "string" && user.user_metadata.student_id.trim()
          ? user.user_metadata.student_id.trim()
          : null

    // Create a default profile for the user
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        lrn,
        first_name: firstName,
        last_name: lastName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.log("[v0] Error creating profile:", error)
      // If profile creation fails, show a fallback profile
      profile = {
        id: user.id,
        email: user.email,
        lrn: lrn || "",
        first_name: firstName,
        last_name: lastName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    } else {
      profile = newProfile
    }
  }

  return <ProfileView profile={profile} />
}
