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
import { normalizeEmail } from "@/lib/admin"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react"

export function SignupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [formData, setFormData] = useState({
    lrn: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  // Password validation rules
  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push("At least 8 characters")
    }
    
    if (!/\d/.test(password)) {
      errors.push("At least 1 number")
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("At least 1 special character")
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("At least 1 uppercase letter")
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push("At least 1 lowercase letter")
    }
    
    return errors
  }

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password })
    setPasswordErrors(validatePassword(password))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    // Validate password
    const passwordValidationErrors = validatePassword(formData.password)
    if (passwordValidationErrors.length > 0) {
      setError("Please fix password requirements")
      setPasswordErrors(passwordValidationErrors)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.lrn.length !== 12) {
      setError("LRN must be 12 digits")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const normalizedEmail = normalizeEmail(formData.email)
      const normalizedFirstName = formData.firstName.trim()
      const normalizedLastName = formData.lastName.trim()
      const fullName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(" ").trim()

      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: formData.password,
        options: {
          data: {
            lrn: formData.lrn,
            first_name: normalizedFirstName,
            last_name: normalizedLastName,
            full_name: fullName || normalizedEmail.split("@")[0] || "User",
            student_id: formData.lrn,
          },
        },
      })

      if (authError) throw authError

      if (signUpData.session) {
        router.push("/home")
        router.refresh()
        return
      }

      router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}&context=signup`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during signup"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Password requirements checklist
  const passwordRequirements = [
    { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { label: "At least 1 number", test: (p: string) => /\d/.test(p) },
    { label: "At least 1 special character", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
    { label: "At least 1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { label: "At least 1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  ]

  // Check if password is valid (all requirements met)
  const isPasswordValid = passwordRequirements.every(req => req.test(formData.password))

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 sm:px-6 sm:py-10 bg-background">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">Sign up to report incidents safely</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}

              <div className="space-y-2">
                <Label htmlFor="lrn">LRN (Learner Reference Number)</Label>
                <Input
                  id="lrn"
                  type="text"
                  placeholder="Enter your 12-digit LRN"
                  maxLength={12}
                  value={formData.lrn}
                  onChange={(e) => setFormData({ ...formData, lrn: e.target.value.replace(/\D/g, "") })}
                  required
                  className="bg-input"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="bg-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@school.edu"
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
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
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
                
                {/* Password requirements checklist */}
                {formData.password && (
                  <div className="mt-2 space-y-1 p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium">Password must contain:</p>
                    <div className="space-y-1">
                      {passwordRequirements.map((req, index) => {
                        const isMet = req.test(formData.password)
                        return (
                          <div key={index} className="flex items-center gap-2">
                            {isMet ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className={`text-xs ${isMet ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {req.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className={`bg-input pr-10 ${
                      formData.confirmPassword && 
                      formData.password !== formData.confirmPassword 
                        ? 'border-destructive focus-visible:ring-destructive' 
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && isPasswordValid && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Passwords match
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !isPasswordValid || formData.password !== formData.confirmPassword}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already registered?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Login here
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
