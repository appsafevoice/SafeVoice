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
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/client"
import { isSuperAdminEmail, normalizeEmail } from "@/lib/admin"
import { Loader2, RefreshCcw, Search, Trash2, Users } from "lucide-react"

type StudentAccountRow = {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  lrn: string | null
  student_id: string | null
  school_id_url: string | null
  created_at: string
}

type AdminAccountEmailRow = {
  email: string
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

export function StudentAccountsManager() {
  const supabase = useMemo(() => createBrowserClient(), [])

  const [students, setStudents] = useState<StudentAccountRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null)
  const [studentPendingDelete, setStudentPendingDelete] = useState<StudentAccountRow | null>(null)

  const canManageStudents = isSuperAdminEmail(currentUserEmail)

  const loadCurrentUserEmail = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setCurrentUserEmail(user?.email ? normalizeEmail(user.email) : null)
  }

  const fetchStudents = async () => {
    setIsLoading(true)
    setErrorMessage("")

    const [{ data: profileRows, error: profilesError }, { data: adminRows, error: adminError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, first_name, last_name, lrn, student_id, school_id_url, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("admin_accounts").select("email"),
    ])

    if (profilesError) {
      if (profilesError.code === "42501") {
        setErrorMessage("Only the Super Admin can load the student account list.")
      } else {
        setErrorMessage(profilesError.message || "Failed to load student accounts.")
      }
      setStudents([])
      setIsLoading(false)
      return
    }

    if (adminError) {
      setErrorMessage(adminError.message || "Failed to load admin account references.")
      setStudents([])
      setIsLoading(false)
      return
    }

    const adminEmails = new Set(((adminRows as AdminAccountEmailRow[] | null) || []).map((row) => normalizeEmail(row.email)))
    const nextStudents = ((profileRows as StudentAccountRow[] | null) || []).filter(
      (profile) => !adminEmails.has(normalizeEmail(profile.email)),
    )

    setStudents(nextStudents)
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

    if (!canManageStudents) {
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
              <p className="text-sm text-slate-400">
                Search student accounts and permanently remove them from SafeVoice and Supabase Authentication.
              </p>
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
        {currentUserEmail && !canManageStudents && (
          <Alert className="bg-amber-500/10 border-amber-500/50">
            <AlertDescription className="text-amber-300">
              Only the Super Admin can search or delete student accounts.
            </AlertDescription>
          </Alert>
        )}

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
              const lrn = student.lrn?.trim() || student.student_id?.trim() || "No LRN"

              return (
                <div
                  key={student.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-700/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{getStudentDisplayName(student)}</p>
                      <Badge variant="outline" className="border-slate-500 text-slate-200">
                        Student
                      </Badge>
                      {student.school_id_url && (
                        <Badge variant="outline" className="border-emerald-400/40 text-emerald-200">
                          School ID
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-400">{student.email}</p>
                    <p className="text-xs text-slate-300">LRN: {lrn}</p>
                    <p className="text-[11px] text-slate-500">Created {new Date(student.created_at).toLocaleString()}</p>
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setStudentPendingDelete(student)}
                    disabled={isProcessing || !canManageStudents}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </Button>
                </div>
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
      </CardContent>
    </Card>
  )
}
