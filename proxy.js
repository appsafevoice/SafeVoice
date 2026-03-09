import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { isLegacyAdminEmail, normalizeEmail } from "@/lib/admin"
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/config"

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userEmail = normalizeEmail(user?.email)

  let userIsAdmin = false
  if (userEmail) {
    const { data: adminAccount, error: adminError } = await supabase
      .from("admin_accounts")
      .select("email")
      .eq("email", userEmail)
      .eq("is_active", true)
      .maybeSingle()

    if (!adminError) {
      userIsAdmin = Boolean(adminAccount) || isLegacyAdminEmail(userEmail)
    } else if (adminError.code === "42P01") {
      // Fallback while admin_accounts table is not yet created.
      userIsAdmin = isLegacyAdminEmail(userEmail)
    }
  }

  // Protected routes
  const protectedRoutes = ["/home", "/report", "/profile"]
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    if (!userIsAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = "/home"
      return NextResponse.redirect(url)
    }
  }

  // Auth routes (redirect if logged in)
  const authRoutes = ["/login", "/signup", "/forgot-password"]
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = userIsAdmin ? "/admin/dashboard" : "/home"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
