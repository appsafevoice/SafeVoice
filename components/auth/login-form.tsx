"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"
import { isSuperAdminEmail, normalizeEmail } from "@/lib/admin"
import { Eye, EyeOff, Loader2 } from "lucide-react"

type PendingAdminFirstLogin = {
  full_name: string
  position: string | null
  email: string
}

function isEmailVerificationPendingError(message?: string) {
  const normalizedMessage = (message || "").toLowerCase()
  return normalizedMessage.includes("not confirmed") || normalizedMessage.includes("not verified")
}

function isInvalidCredentialsError(message?: string) {
  const normalizedMessage = (message || "").toLowerCase()
  return (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid email or password") ||
    normalizedMessage.includes("invalid credentials")
  )
}

function isEmailRateLimitError(message?: string) {
  const normalizedMessage = (message || "").toLowerCase()
  return (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests") ||
    normalizedMessage.includes("email rate limit exceeded")
  )
}

function isMissingAdminFirstLoginSetupError(code?: string, message?: string) {
  const normalizedMessage = (message || "").toLowerCase()
  return (
    code === "42883" ||
    code === "PGRST202" ||
    normalizedMessage.includes("admin_accounts_prepare_first_login") ||
    normalizedMessage.includes("schema cache")
  )
}

function getFriendlyAdminLoginError() {
  return "This admin account is not ready to sign in yet. Please try again later."
}

function getFriendlyReservedAdminSyncError() {
  return "This admin account is still being set up. Please try again in a moment."
}

function getFriendlyAdminVerificationError(message?: string) {
  const normalizedMessage = (message || "").toLowerCase()

  if (isEmailRateLimitError(normalizedMessage)) {
    return "Too many attempts were made. Please wait a bit, then try again."
  }

  return "We couldn't continue admin sign in right now. Please try again."
}

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setPendingVerificationEmail("")
    setLoading(true)

    try {
      const supabase = createClient()
      const normalizedEmail = normalizeEmail(formData.email)

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: formData.password,
      })

      if (authError) throw authError

      const userEmail = normalizeEmail(data.user?.email)
      let isAdmin = false

      if (userEmail) {
        const { data: adminAccount, error: adminError } = await supabase
          .from("admin_accounts")
          .select("email")
          .eq("email", userEmail)
          .eq("is_active", true)
          .maybeSingle()

        if (adminError) {
          if (adminError.code !== "42P01") {
            throw adminError
          }
        } else {
          isAdmin = Boolean(adminAccount)
        }
      }

      if (isAdmin) {
        router.push("/admin/dashboard")
      } else {
        router.push("/home")
      }
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Invalid email or password"
      if (isEmailVerificationPendingError(errorMessage)) {
        setPendingVerificationEmail(normalizeEmail(formData.email))
        setError("Email not verified yet. Enter the 8-digit code sent to your email to continue.")
      } else if (isInvalidCredentialsError(errorMessage)) {
        const supabase = createClient()
        const normalizedEmail = normalizeEmail(formData.email)
        const { data: pendingAdminRows, error: pendingAdminError } = await supabase.rpc(
          "admin_accounts_prepare_first_login",
          {
            p_email: normalizedEmail,
            p_password: formData.password,
          },
        )

        if (pendingAdminError) {
          if (isMissingAdminFirstLoginSetupError(pendingAdminError.code, pendingAdminError.message)) {
            setError(getFriendlyAdminLoginError())
          } else {
            setError(getFriendlyAdminVerificationError(pendingAdminError.message))
          }
        } else {
          const pendingAdmin = Array.isArray(pendingAdminRows)
            ? (pendingAdminRows[0] as PendingAdminFirstLogin | undefined)
            : undefined

          if (!pendingAdmin) {
            if (isSuperAdminEmail(normalizedEmail)) {
              setError(getFriendlyReservedAdminSyncError())
            } else {
              setError(errorMessage)
            }
          } else {
            const fullName = pendingAdmin.full_name?.trim() || normalizedEmail.split("@")[0] || "Admin"
            const [firstName, ...lastNameParts] = fullName.split(/\s+/)
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: normalizedEmail,
              password: formData.password,
              options: {
                data: {
                  full_name: fullName,
                  first_name: firstName || fullName,
                  last_name: lastNameParts.join(" "),
                  position: pendingAdmin.position || "",
                  role: "admin",
                },
              },
            })

            if (signUpError) {
              if (isEmailRateLimitError(signUpError.message)) {
                setError("Too many attempts were made. Please wait a bit, then try again.")
              } else {
                setError(getFriendlyAdminVerificationError(signUpError.message))
              }
            } else if (signUpData.session) {
              router.push("/admin/dashboard")
              router.refresh()
            } else {
              router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}&context=admin`)
            }
          }
        }
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-10 bg-background">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">Sign in to your SafeVoice account</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}
              {pendingVerificationEmail && (
                <div className="p-3 text-sm text-primary bg-primary/10 rounded-lg">
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(pendingVerificationEmail)}&context=signup`}
                    className="font-medium hover:underline"
                  >
                    Verify this email with your 8-digit code
                  </Link>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                    placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="bg-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Not yet registered?{" "}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  Sign up now
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
