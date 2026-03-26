"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"
import { normalizeEmail } from "@/lib/admin"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, Upload, X, ImageIcon, FileText } from "lucide-react"

const SCHOOL_ID_BUCKET = "report-attachments"
const MAX_SCHOOL_ID_FILE_SIZE_BYTES = 10 * 1024 * 1024

function isImageSchoolIdFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name)
}

function isPdfSchoolIdFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name)
}

function isAcceptedSchoolIdFile(file: File) {
  return isImageSchoolIdFile(file) || isPdfSchoolIdFile(file)
}

function sanitizeStorageSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "student"
}

export function SignupForm() {
  const router = useRouter()
  const schoolIdInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [schoolIdFile, setSchoolIdFile] = useState<File | null>(null)
  const [schoolIdPreviewUrl, setSchoolIdPreviewUrl] = useState("")
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

  useEffect(() => {
    if (!schoolIdFile || !isImageSchoolIdFile(schoolIdFile)) {
      setSchoolIdPreviewUrl("")
      return
    }

    const previewUrl = URL.createObjectURL(schoolIdFile)
    setSchoolIdPreviewUrl(previewUrl)

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [schoolIdFile])

  const handleSchoolIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    if (!selectedFile) {
      setSchoolIdFile(null)
      return
    }

    if (!isAcceptedSchoolIdFile(selectedFile)) {
      setError("Upload a School ID as an image or PDF.")
      e.target.value = ""
      setSchoolIdFile(null)
      return
    }

    if (selectedFile.size > MAX_SCHOOL_ID_FILE_SIZE_BYTES) {
      setError("School ID attachment must be 10MB or smaller.")
      e.target.value = ""
      setSchoolIdFile(null)
      return
    }

    setError("")
    setSchoolIdFile(selectedFile)
  }

  const removeSchoolIdFile = () => {
    setSchoolIdFile(null)
    if (schoolIdInputRef.current) {
      schoolIdInputRef.current.value = ""
    }
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

    if (!schoolIdFile) {
      setError("School ID attachment is required")
      return
    }

    if (!isAcceptedSchoolIdFile(schoolIdFile)) {
      setError("Upload a School ID as an image or PDF.")
      return
    }

    if (schoolIdFile.size > MAX_SCHOOL_ID_FILE_SIZE_BYTES) {
      setError("School ID attachment must be 10MB or smaller.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const normalizedEmail = normalizeEmail(formData.email)
      const normalizedFirstName = formData.firstName.trim()
      const normalizedLastName = formData.lastName.trim()
      const fullName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(" ").trim()
      const schoolIdFileExt = schoolIdFile.name.split(".").pop() || "png"
      const schoolIdStoragePath = `school-ids/${sanitizeStorageSegment(normalizedEmail)}-${sanitizeStorageSegment(formData.lrn)}-${Date.now()}.${schoolIdFileExt}`

      const { data: schoolIdUploadData, error: schoolIdUploadError } = await supabase.storage
        .from(SCHOOL_ID_BUCKET)
        .upload(schoolIdStoragePath, schoolIdFile)

      if (schoolIdUploadError || !schoolIdUploadData) {
        throw new Error(schoolIdUploadError?.message || "Failed to upload your School ID attachment.")
      }

      const { data: schoolIdUrlData } = supabase.storage.from(SCHOOL_ID_BUCKET).getPublicUrl(schoolIdStoragePath)
      const schoolIdUrl = schoolIdUrlData.publicUrl

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
            school_id_url: schoolIdUrl,
          },
        },
      })

      if (authError) {
        await supabase.storage.from(SCHOOL_ID_BUCKET).remove([schoolIdStoragePath]).catch(() => undefined)
        throw authError
      }

      if (signUpData.user?.id) {
        await supabase.from("profiles").upsert(
          {
            id: signUpData.user.id,
            email: normalizedEmail,
            lrn: formData.lrn,
            first_name: normalizedFirstName,
            last_name: normalizedLastName,
            full_name: fullName || normalizedEmail.split("@")[0] || "User",
            student_id: formData.lrn,
            school_id_url: schoolIdUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
      }

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
                <Label htmlFor="schoolId">School ID Attachment</Label>
                <Input
                  ref={schoolIdInputRef}
                  id="schoolId"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleSchoolIdChange}
                  required
                  className="hidden"
                />
                {!schoolIdFile && (
                  <button
                    type="button"
                    onClick={() => schoolIdInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-accent/50"
                  >
                    <Upload className="h-5 w-5" />
                    Upload School ID image or PDF (required)
                  </button>
                )}
                <p className="text-xs text-muted-foreground">Required for student verification. Maximum file size: 10MB.</p>

                {schoolIdFile && (
                  <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
                    {schoolIdPreviewUrl ? (
                      <div className="bg-muted/60 p-3">
                        <div className="overflow-hidden rounded-lg border border-border bg-background">
                          <img
                            src={schoolIdPreviewUrl}
                            alt="School ID preview"
                            className="h-56 w-full object-contain bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center gap-2 border-b border-border bg-muted/60 px-3 py-3 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">PDF attached</p>
                        <p className="text-xs text-muted-foreground">Preview is not available for PDF files here.</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 px-3 py-2">
                      {schoolIdPreviewUrl ? (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="flex-1 truncate text-sm">{schoolIdFile.name}</span>
                      <button
                        type="button"
                        onClick={() => schoolIdInputRef.current?.click()}
                        className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-background"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={removeSchoolIdFile}
                        className="rounded p-1 transition-colors hover:bg-background"
                        aria-label="Remove School ID attachment"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}
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
                disabled={loading || !schoolIdFile || !isPasswordValid || formData.password !== formData.confirmPassword}
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
