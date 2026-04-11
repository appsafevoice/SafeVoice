"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { createBrowserClient } from "@/lib/supabase/client"
import { isSuperAdminEmail, normalizeEmail } from "@/lib/admin"
import { ChevronDown, ExternalLink, Loader2, RefreshCcw, Search, Trash2, Users } from "lucide-react"

const SCHOOL_ID_BUCKET = "school-ids"
const SCHOOL_ID_SIGNED_URL_TTL_SECONDS = 60 * 60

type StudentAccountRow = {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  lrn: string | null
  student_id: string | null
  school_id_url: string | null
  is_verified: boolean
  verified_at: string | null
  verified_by_email: string | null
  created_at: string
  gender: string | null
  year_level: string | null
}

type AdminProfileRow = {
  email: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
}

function getStudentDisplayName(student: StudentAccountRow) {
  const fullName =
    student.full_name?.trim() ||
    [student.first_name, student.last_name]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ")
      .trim()

  return fullName || normalizeEmail(student.email).split("@")[0] || "Unnamed Student"
}

function getAdminDisplayName(admin: AdminProfileRow) {
  const fullName =
    admin.full_name?.trim() ||
    [admin.first_name, admin.last_name]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ")
      .trim()

  if (fullName) return fullName
  if (!admin.email) return "Admin"
  return normalizeEmail(admin.email).split("@")[0] || "Admin"
}

function getStudentIdentifier(student: StudentAccountRow) {
  return student.lrn?.trim() || student.student_id?.trim() || null
}

function isStudentAccount(student: StudentAccountRow) {
  return Boolean(getStudentIdentifier(student) || student.school_id_url?.trim())
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")
}

function isPdfSchoolIdReference(value: string) {
  return value.toLowerCase().includes(".pdf")
}

export function StudentAccountsManager() {
  const supabase = useMemo(() => createBrowserClient(), [])

  const [students, setStudents] = useState<StudentAccountRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null)
  const [studentPendingDelete, setStudentPendingDelete] = useState<StudentAccountRow | null>(null)
  const [studentPendingVerify, setStudentPendingVerify] = useState<StudentAccountRow | null>(null)
  const [openStudentDetails, setOpenStudentDetails] = useState<Record<string, boolean>>({})
  const [schoolIdAssetUrls, setSchoolIdAssetUrls] = useState<Record<string, string>>({})
  const [schoolIdAssetLoading, setSchoolIdAssetLoading] = useState<Record<string, boolean>>({})
  const [schoolIdAssetErrors, setSchoolIdAssetErrors] = useState<Record<string, string>>({})
  const [verifierNameByEmail, setVerifierNameByEmail] = useState<Record<string, string>>({})

  const canDeleteStudents = isSuperAdminEmail(currentUserEmail)
  const canVerifyStudents = Boolean(currentUserEmail)

  const loadCurrentUserEmail = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const normalizedEmail = user?.email ? normalizeEmail(user.email) : null
    setCurrentUserEmail(normalizedEmail)

    if (!normalizedEmail) {
      setCurrentUserName(null)
      return
    }

    const { data: profileRows, error } = await supabase
      .from("profiles")
      .select("email, full_name, first_name, last_name")
      .eq("email", normalizedEmail)
      .limit(1)

    if (error) {
      setCurrentUserName(null)
      return
    }

    const profileRow = Array.isArray(profileRows) ? (profileRows[0] as AdminProfileRow | undefined) : undefined
    if (!profileRow) {
      setCurrentUserName(null)
      return
    }

    setCurrentUserName(getAdminDisplayName(profileRow))
  }

  const loadVerifierNames = async (studentRows: StudentAccountRow[]) => {
    const verifierEmails = Array.from(
      new Set(
        studentRows
          .map((student) => student.verified_by_email?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).map((email) => normalizeEmail(email))

    if (verifierEmails.length === 0) {
      setVerifierNameByEmail({})
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("email, full_name, first_name, last_name")
      .in("email", verifierEmails)

    if (error) {
      setVerifierNameByEmail({})
      return
    }

    const rows = (data as AdminProfileRow[] | null) || []
    const nextMap: Record<string, string> = {}
    for (const row of rows) {
      const email = row.email?.trim()
      if (!email) continue
      nextMap[normalizeEmail(email)] = getAdminDisplayName(row)
    }

    setVerifierNameByEmail(nextMap)
  }

  const fetchStudents = async () => {
    setIsLoading(true)
    setErrorMessage("")

    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, first_name, last_name, lrn, student_id, school_id_url, is_verified, verified_at, verified_by_email, created_at, gender, year_level")
      .order("created_at", { ascending: false })

    if (profilesError) {
      if (profilesError.code === "42501") {
        setErrorMessage("Only admins can load the student account list.")
      } else {
        setErrorMessage(profilesError.message || "Failed to load student accounts.")
      }
      setStudents([])
      setIsLoading(false)
      return
    }

    const nextStudents = ((profileRows as StudentAccountRow[] | null) || []).filter(isStudentAccount)

    setStudents(nextStudents)
    setOpenStudentDetails({})
    setSchoolIdAssetUrls({})
    setSchoolIdAssetLoading({})
    setSchoolIdAssetErrors({})
    setStudentPendingVerify(null)
    await loadVerifierNames(nextStudents)
    setIsLoading(false)
  }

  useEffect(() => {
    loadCurrentUserEmail()
    fetchStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deleteStudent = async (student: StudentAccountRow) => {
    setErrorMessage("")
    setSuccessMessage("")

    if (!canDeleteStudents) {
      setErrorMessage("Only the Super Admin can delete student accounts.")
      setStudentPendingDelete(null)
      return
    }

    setProcessingStudentId(student.id)

    const { error } = await supabase.rpc("super_admin_delete_student_account", {
      p_profile_id: student.id,
    })

    if (error) {
      if (error.code === "42883" || error.code === "PGRST202") {
        setErrorMessage(
          "Database is missing the synchronized student deletion function. Apply the latest Supabase migrations and try again.",
        )
      } else if (error.code === "42501") {
        setErrorMessage("Only the Super Admin can delete student accounts.")
      } else {
        setErrorMessage(error.message || "Failed to delete the student account.")
      }
      setProcessingStudentId(null)
      return
    }

    setStudents((prev) => prev.filter((item) => item.id !== student.id))
    setStudentPendingDelete(null)
    setProcessingStudentId(null)
    setSuccessMessage("Student account removed from the database and Supabase Authentication.")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const setStudentVerified = async (student: StudentAccountRow, nextVerified: boolean) => {
    setErrorMessage("")
    setSuccessMessage("")

    if (student.is_verified && !nextVerified) {
      setErrorMessage("Verified student accounts cannot be unverified.")
      return
    }

    if (!canVerifyStudents) {
      setErrorMessage("Only admins can verify student accounts.")
      return
    }

    setProcessingStudentId(student.id)

    const { data, error } = await supabase.rpc("set_student_account_verification", {
      p_profile_id: student.id,
      p_is_verified: nextVerified,
    })

    if (error) {
      if (error.code === "42883" || error.code === "PGRST202") {
        setErrorMessage("Database is missing the student verification function. Apply the latest Supabase migrations and try again.")
      } else if (error.code === "42501") {
        setErrorMessage("Only admins can verify student accounts.")
      } else {
        setErrorMessage(error.message || "Failed to update student verification.")
      }
      setProcessingStudentId(null)
      return
    }

    const updatedRow = Array.isArray(data) ? data[0] : null
    setStudents((prev) =>
      prev.map((item) =>
        item.id === student.id
          ? {
              ...item,
              is_verified: updatedRow?.is_verified ?? nextVerified,
              verified_at: updatedRow?.verified_at ?? (nextVerified ? new Date().toISOString() : null),
              verified_by_email: updatedRow?.verified_by_email ?? (nextVerified ? currentUserEmail : null),
            }
          : item,
      ),
    )

    if (nextVerified && currentUserEmail && currentUserName) {
      const verifierEmail = normalizeEmail(currentUserEmail)
      setVerifierNameByEmail((prev) => ({ ...prev, [verifierEmail]: currentUserName }))
    }

    setSuccessMessage("Student account verified.")
    setTimeout(() => setSuccessMessage(""), 3000)
    setProcessingStudentId(null)
  }

  const confirmVerifyStudent = async () => {
    if (!studentPendingVerify) return
    await setStudentVerified(studentPendingVerify, true)
    setStudentPendingVerify(null)
  }

  const ensureSchoolIdAssetUrl = async (student: StudentAccountRow) => {
    const reference = student.school_id_url?.trim() || ""
    if (!reference) return

    if (isAbsoluteUrl(reference)) {
      setSchoolIdAssetUrls((prev) => ({ ...prev, [student.id]: reference }))
      return
    }

    if (schoolIdAssetUrls[student.id] || schoolIdAssetLoading[student.id]) return

    setSchoolIdAssetLoading((prev) => ({ ...prev, [student.id]: true }))
    setSchoolIdAssetErrors((prev) => {
      if (!prev[student.id]) return prev
      const next = { ...prev }
      delete next[student.id]
      return next
    })

    const { data, error } = await supabase.storage
      .from(SCHOOL_ID_BUCKET)
      .createSignedUrl(reference, SCHOOL_ID_SIGNED_URL_TTL_SECONDS)

    if (error || !data?.signedUrl) {
      setSchoolIdAssetErrors((prev) => ({
        ...prev,
        [student.id]: error?.message || "Unable to load the School ID attachment. Ensure admin storage read policies are applied.",
      }))
      setSchoolIdAssetLoading((prev) => ({ ...prev, [student.id]: false }))
      return
    }

    setSchoolIdAssetUrls((prev) => ({ ...prev, [student.id]: data.signedUrl }))
    setSchoolIdAssetLoading((prev) => ({ ...prev, [student.id]: false }))
  }

  const filteredStudents = students.filter((student) => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return true

    return [
      getStudentDisplayName(student),
      student.email,
      student.lrn || "",
      student.student_id || "",
    ].some((value) => value.toLowerCase().includes(query))
  })

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white p-2">
              <Users className="w-5 h-5 text-black" />
            </div>
            <div>
              <CardTitle className="text-white">Student Management</CardTitle>
              <p className="text-sm text-slate-400">Review student accounts, verify reporting access, and manage student records.</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={fetchStudents}
            className="border-slate-300 bg-white text-black hover:bg-slate-100 hover:text-black"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-black" />
            ) : (
              <RefreshCcw className="w-4 h-4 mr-2 text-black" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {successMessage && (
          <Alert className="bg-green-500/10 border-green-500/50">
            <AlertDescription className="text-green-400">{successMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert className="bg-red-500/10 border-red-500/50">
            <AlertDescription className="text-red-400">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, email, or LRN"
            className="pl-9 bg-slate-700/50 border-slate-600 text-white"
          />
        </div>

        <p className="text-xs text-slate-400">
          Showing {filteredStudents.length} of {students.length} student account{students.length === 1 ? "" : "s"}.
        </p>

        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-sm text-slate-400">
            {students.length === 0 ? "No student accounts found." : "No student accounts match your search."}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((student) => {
              const isProcessing = processingStudentId === student.id
              const lrn = getStudentIdentifier(student) || "No LRN"
              const verifiedBy = student.verified_by_email?.trim() || null
              const isDetailsOpen = openStudentDetails[student.id] ?? false
              const schoolIdReference = student.school_id_url?.trim() || ""
              const schoolIdAssetUrl =
                schoolIdAssetUrls[student.id] || (schoolIdReference && isAbsoluteUrl(schoolIdReference) ? schoolIdReference : "")
              const schoolIdLoading = Boolean(schoolIdAssetLoading[student.id])
              const schoolIdError = schoolIdAssetErrors[student.id] || ""
              const schoolIdIsPdf = schoolIdReference ? isPdfSchoolIdReference(schoolIdReference) : false

              return (
                <Collapsible
                  key={student.id}
                  open={isDetailsOpen}
                  onOpenChange={(open) => {
                    setOpenStudentDetails((prev) => ({ ...prev, [student.id]: open }))
                    if (open) {
                      void ensureSchoolIdAssetUrl(student)
                    }
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-700/30"
                >
                  <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{getStudentDisplayName(student)}</p>
                        <Badge variant="outline" className="border-slate-500 text-slate-200">
                          Student
                        </Badge>
                        {student.is_verified ? (
                          <Badge variant="outline" className="border border-emerald-600 bg-emerald-100 text-emerald-950">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border border-amber-600 bg-amber-100 text-amber-950">
                            Pending Verification
                          </Badge>
                        )}
                        {student.school_id_url && (
                          <Badge variant="outline" className="border border-emerald-600 bg-emerald-50 text-emerald-950">
                            School ID
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-400">{student.email}</p>
                      <p className="text-xs text-slate-300">LRN: {lrn}</p>
                      <p className="text-xs text-slate-300">
                        {student.is_verified
                          ? `Verified${verifiedBy ? ` by ${verifiedBy}` : ""}${student.verified_at ? ` on ${new Date(student.verified_at).toLocaleString()}` : ""}`
                          : "Reporting access is disabled until an admin verifies this account."}
                      </p>
                      <p className="text-[11px] text-slate-500">Created {new Date(student.created_at).toLocaleString()}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 sm:justify-end">
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="group border-slate-500 bg-slate-800/30 text-slate-100 hover:bg-slate-700/40 hover:text-white"
                        >
                          Details
                          <ChevronDown className="ml-1 h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{student.is_verified ? "Verified" : "Unverified"}</span>
                      <Switch
                        checked={student.is_verified}
                        onCheckedChange={(value) => {
                          if (!value) return
                          setStudentPendingVerify(student)
                        }}
                        disabled={isProcessing || !canVerifyStudents || student.is_verified}
                        title={student.is_verified ? "Verification is permanent." : "Verify this student account."}
                        className="data-[state=unchecked]:bg-[#4b5d7c] data-[state=checked]:bg-emerald-500"
                      />
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setStudentPendingDelete(student)}
                        disabled={isProcessing || !canDeleteStudents}
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete
                      </Button>
                    </div>
                  </div>

                  <CollapsibleContent className="border-t border-slate-700 px-3 pb-3 pt-3">
                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-slate-400">Email</p>
                        <p className="text-slate-100 break-all">{student.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400">Full Name</p>
                        <p className="text-slate-100">{student.full_name?.trim() || `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Not provided"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400">Gender</p>
                        <p className="text-slate-100 capitalize">{student.gender || "Not provided"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400">Year Level</p>
                        <p className="text-slate-100">{student.year_level ? `Year ${student.year_level}` : "Not provided"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400">Identifiers</p>
                        <p className="text-slate-100">
                          {student.lrn?.trim() ? `LRN: ${student.lrn.trim()}` : "LRN: Not provided"}
                          {student.student_id?.trim() ? ` | Student ID: ${student.student_id.trim()}` : " | Student ID: Not provided"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400">Verification</p>
                        <p className="text-slate-100">
                          {student.is_verified
                            ? `Verified${verifiedBy ? ` by ${verifiedBy}` : ""}${student.verified_at ? ` on ${new Date(student.verified_at).toLocaleString()}` : ""}`
                            : "Pending verification"}
                        </p>
                        {student.is_verified && <p className="text-[11px] text-slate-400">Verification is permanent.</p>}
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400">Created</p>
                        <p className="text-slate-100">{new Date(student.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-200">School ID Image</p>
                        {schoolIdAssetUrl && (
                          <a
                            href={schoolIdAssetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                          >
                            Open full file
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>

                      {schoolIdReference ? (
                        schoolIdLoading ? (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading School ID attachment...
                          </div>
                        ) : schoolIdError ? (
                          <p className="mt-2 text-xs text-red-300">{schoolIdError}</p>
                        ) : schoolIdAssetUrl ? (
                          schoolIdIsPdf ? (
                            <p className="mt-2 text-xs text-slate-400">PDF attached. Use Open full file to view.</p>
                          ) : (
                            <div className="mt-2 overflow-hidden rounded-md border border-slate-600 bg-slate-800/40">
                              <img
                                src={schoolIdAssetUrl}
                                alt={`School ID for ${getStudentDisplayName(student)}`}
                                loading="lazy"
                                className="max-h-80 w-full object-contain bg-white"
                              />
                            </div>
                          )
                        ) : (
                          <p className="mt-2 text-xs text-slate-400">
                            School ID attachment is present but could not be loaded.
                          </p>
                        )
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">No School ID image uploaded.</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )}

        <AlertDialog
          open={!!studentPendingDelete}
          onOpenChange={(open) => {
            if (open) return
            setStudentPendingDelete(null)
          }}
        >
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this student account?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                {studentPendingDelete
                  ? `This will permanently delete ${getStudentDisplayName(studentPendingDelete)} from SafeVoice and remove the linked Supabase Authentication user. Existing reports will remain, but they will no longer be attached to the deleted account.`
                  : "This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={processingStudentId === studentPendingDelete?.id}
                className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!studentPendingDelete || processingStudentId === studentPendingDelete?.id}
                onClick={() => {
                  if (!studentPendingDelete) return
                  void deleteStudent(studentPendingDelete)
                }}
                className="bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500/40"
              >
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!studentPendingVerify}
          onOpenChange={(open) => {
            if (open) return
            if (studentPendingVerify && processingStudentId === studentPendingVerify.id) return
            setStudentPendingVerify(null)
          }}
        >
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Verify this student account?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                {studentPendingVerify
                  ? `This will enable reporting access for ${getStudentDisplayName(studentPendingVerify)}. Verification is permanent and cannot be undone.`
                  : "This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={processingStudentId === studentPendingVerify?.id}
                className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!studentPendingVerify || processingStudentId === studentPendingVerify?.id}
                onClick={() => {
                  void confirmVerifyStudent()
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500/40"
              >
                {processingStudentId === studentPendingVerify?.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Confirm Verification"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
