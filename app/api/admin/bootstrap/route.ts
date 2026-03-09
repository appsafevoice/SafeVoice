import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config"
import { ADMIN_BOOTSTRAP_ACCOUNTS } from "./accounts"

export async function POST() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const failed: { email: string; error: string }[] = []

  for (const account of ADMIN_BOOTSTRAP_ACCOUNTS) {
    const [firstName, ...lastNameParts] = account.fullName.split(" ")
    const lastName = lastNameParts.join(" ")

    const { error } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        data: {
          full_name: account.fullName,
          first_name: firstName || account.fullName,
          last_name: lastName || "",
          role: "admin",
        },
      },
    })

    if (error) {
      const message = error.message.toLowerCase()
      const alreadyRegistered =
        message.includes("already registered") ||
        message.includes("already been registered") ||
        message.includes("exists")

      if (!alreadyRegistered) {
        failed.push({
          email: account.email,
          error: error.message,
        })
      }
    }
  }

  if (failed.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        failed,
      },
      { status: 400 },
    )
  }

  return NextResponse.json({
    ok: true,
    processed: ADMIN_BOOTSTRAP_ACCOUNTS.length,
  })
}
