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
import { isReservedAdminEmail } from "@/lib/admin"
import { Eye, EyeOff, Upload, Loader2, CheckCircle, XCircle } from "lucide-react"

export function SignupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [schoolIdFile, setSchoolIdFile] = useState<File | null>(null)
  const [schoolIdVerified, setSchoolIdVerified] = useState(false)
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

  const verifySchoolIdFormat = async (file: File): Promise<{ valid: boolean; message: string }> => {
    if (!file.type.startsWith("image/")) {
      return { valid: false, message: "School ID must be an image file." }
    }

    const imageUrl = URL.createObjectURL(file)
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error("Failed to read image"))
        img.src = imageUrl
      })

      const width = image.naturalWidth
      const height = image.naturalHeight
      if (!width || !height) {
        return { valid: false, message: "Invalid image." }
      }

      const aspectRatio = width / height
      if (aspectRatio < 0.45 || aspectRatio > 0.78) {
        return { valid: false, message: "ID format mismatch: please upload a vertical school ID image." }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d")

      if (!context) {
        return { valid: false, message: "Unable to validate image format." }
      }

      context.drawImage(image, 0, 0)

      const getRegionStats = (x: number, y: number, w: number, h: number) => {
        const clampedW = Math.max(1, Math.floor(w))
        const clampedH = Math.max(1, Math.floor(h))
        const data = context.getImageData(Math.floor(x), Math.floor(y), clampedW, clampedH).data

        let darkCount = 0
        let lightCount = 0
        let cyanDominantCount = 0
        let blueDominantCount = 0
        let skinToneCount = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

          if (luminance < 80) darkCount++
          if (luminance > 185) lightCount++

          const isCyanDominant = g > 110 && b > 110 && r < 180 && (g + b) / 2 > r * 1.05
          const isBlueDominant = b > 110 && b > r * 1.2 && b > g * 1.05
          const isSkinTone =
            r > 95 &&
            g > 40 &&
            b > 20 &&
            Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
            Math.abs(r - g) > 15 &&
            r > g &&
            r > b

          if (isCyanDominant) cyanDominantCount++
          if (isBlueDominant) blueDominantCount++
          if (isSkinTone) skinToneCount++
        }

        const pixels = data.length / 4
        return {
          darkRatio: pixels ? darkCount / pixels : 0,
          lightRatio: pixels ? lightCount / pixels : 0,
          cyanDominantRatio: pixels ? cyanDominantCount / pixels : 0,
          blueDominantRatio: pixels ? blueDominantCount / pixels : 0,
          skinToneRatio: pixels ? skinToneCount / pixels : 0,
        }
      }

      const getVerticalEdgeDensity = (x: number, y: number, w: number, h: number) => {
        const clampedW = Math.max(2, Math.floor(w))
        const clampedH = Math.max(2, Math.floor(h))
        const imageData = context.getImageData(Math.floor(x), Math.floor(y), clampedW, clampedH).data

        let edgeCount = 0
        let comparisons = 0

        const grayAt = (px: number, py: number) => {
          const idx = (py * clampedW + px) * 4
          return (
            0.2126 * imageData[idx] +
            0.7152 * imageData[idx + 1] +
            0.0722 * imageData[idx + 2]
          )
        }

        for (let py = 0; py < clampedH; py++) {
          for (let px = 1; px < clampedW; px++) {
            const diff = Math.abs(grayAt(px, py) - grayAt(px - 1, py))
            if (diff > 38) edgeCount++
            comparisons++
          }
        }

        return comparisons ? edgeCount / comparisons : 0
      }

      const topHeader = getRegionStats(0, 0, width, height * 0.2)
      const topLeftSeal = getRegionStats(0, 0, width * 0.22, height * 0.22)
      const leftBlueDesign = getRegionStats(0, height * 0.22, width * 0.3, height * 0.44)
      const photoArea = getRegionStats(width * 0.28, height * 0.24, width * 0.62, height * 0.45)
      const idNumberArea = getRegionStats(width * 0.02, height * 0.53, width * 0.45, height * 0.1)
      const nameArea = getRegionStats(width * 0.02, height * 0.68, width * 0.6, height * 0.12)
      const bottomBand = getRegionStats(0, height * 0.82, width, height * 0.18)
      const idNumberEdgeDensity = getVerticalEdgeDensity(width * 0.02, height * 0.53, width * 0.45, height * 0.1)
      const nameEdgeDensity = getVerticalEdgeDensity(width * 0.02, height * 0.68, width * 0.6, height * 0.12)

      const hasTealHeader = topHeader.cyanDominantRatio > 0.22 && topHeader.lightRatio > 0.1
      const hasSealContrast = topLeftSeal.darkRatio > 0.14
      const hasLeftBlueDesign = leftBlueDesign.blueDominantRatio > 0.12
      const hasPhotoFace = photoArea.skinToneRatio > 0.015 && photoArea.lightRatio > 0.18
      const hasBottomTealBand = bottomBand.cyanDominantRatio > 0.12
      const hasIdNumberText = idNumberArea.darkRatio > 0.08 && idNumberEdgeDensity > 0.08
      const hasNameText = nameArea.darkRatio > 0.08 && nameEdgeDensity > 0.08

      if (
        !hasTealHeader ||
        !hasSealContrast ||
        !hasLeftBlueDesign ||
        !hasPhotoFace ||
        !hasBottomTealBand ||
        !hasIdNumberText ||
        !hasNameText
      ) {
        return {
          valid: false,
          message: "ID format mismatch: upload a clear University of the Cordilleras ID matching the sample layout.",
        }
      }

      return { valid: true, message: "School ID format verified." }
    } catch {
      return { valid: false, message: "Unable to verify School ID image. Please try another photo." }
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    setSchoolIdVerified(false)

    void (async () => {
      const result = await verifySchoolIdFormat(file)
      if (!result.valid) {
        setSchoolIdFile(null)
        setError(result.message)
        return
      }

      setSchoolIdFile(file)
      setSchoolIdVerified(true)
    })()
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

    if (isReservedAdminEmail(formData.email)) {
      setError("This email is reserved for the administrator account.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/home`,
          data: {
            lrn: formData.lrn,
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      })

      if (authError) throw authError

      router.push("/signup-success")
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

              <div className="space-y-2">
                <Label htmlFor="schoolId">School ID (Optional)</Label>
                <div className="relative">
                  <Input id="schoolId" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <button
                    type="button"
                    onClick={() => document.getElementById("schoolId")?.click()}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-accent/50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate max-w-full">
                      {schoolIdFile ? schoolIdFile.name : "Upload your School ID (optional)"}
                    </span>
                  </button>
                </div>
                {schoolIdFile && schoolIdVerified && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    School ID format verified
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
