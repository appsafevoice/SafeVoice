"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { Loader2, MailCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { normalizeEmail } from "@/lib/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/ui/logo"

type VerifyEmailFormProps = {
  initialEmail?: string
  context?: "signup" | "admin"
}

const RESEND_COOLDOWN_SECONDS = 60
const OTP_LENGTH = 8

export function VerifyEmailForm({ initialEmail = "", context = "signup" }: VerifyEmailFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [info, setInfo] = useState(
    initialEmail ? `We sent a ${OTP_LENGTH}-digit verification code to ${initialEmail}.` : "",
  )
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const accountLabel = context === "admin" ? "admin account" : "account"
  const visibleOtpSlots = OTP_LENGTH

  useEffect(() => {
    if (resendCooldown <= 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [resendCooldown])

  const resolveAuthenticatedRoute = async (userEmail: string) => {
    const normalizedEmail = normalizeEmail(userEmail)
    if (!normalizedEmail) {
      return "/home"
    }

    const { data: adminAccount, error: adminError } = await supabase
      .from("admin_accounts")
      .select("email")
      .eq("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle()

    if (adminError && adminError.code !== "42P01") {
      throw adminError
    }

    return adminAccount ? "/admin/dashboard" : "/home"
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setInfo("")

    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      setError("Email is required.")
      return
    }
    if (otp.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit verification code from your email.`)
      return
    }

    setIsVerifying(true)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type: "email",
      })

      if (verifyError) {
        throw verifyError
      }

      const nextRoute = await resolveAuthenticatedRoute(data.user?.email || normalizedEmail)
      router.replace(nextRoute)
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Invalid verification code."
      setError(errorMessage)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setError("")
    setInfo("")

    if (resendCooldown > 0) {
      setError(`Please wait ${resendCooldown}s before requesting another code.`)
      return
    }

    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      setError("Enter the email address that should receive the code.")
      return
    }

    setIsResending(true)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      })

      if (resendError) {
        throw resendError
      }

      setOtp("")
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setInfo(
        `A new ${OTP_LENGTH}-digit verification code was requested for ${normalizedEmail}. Please allow up to a minute for the email to appear, and check Spam or Promotions if you do not see it.`,
      )
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resend verification code."
      setError(errorMessage)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-10 bg-background">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MailCheck className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold">Verify Your Email</CardTitle>
            <CardDescription>
              Enter the {OTP_LENGTH}-digit code Supabase sent to finish setting up your {accountLabel}.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
            {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}
            {info && <div className="p-3 text-sm text-primary bg-primary/10 rounded-lg">{info}</div>}

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <InputOTP
                  id="otp"
                  maxLength={OTP_LENGTH}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={otp}
                  onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    {Array.from({ length: visibleOtpSlots }, (_, index) => (
                      <InputOTPSlot key={index} index={index} className="h-12 w-12 text-base" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isVerifying || otp.length !== OTP_LENGTH}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
            </form>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend available in ${resendCooldown}s`
              ) : (
                "Resend Code"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already verified?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Login here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
