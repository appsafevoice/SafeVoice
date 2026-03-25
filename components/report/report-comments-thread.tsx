"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { ReportComment } from "@/lib/supabase/types"
import { getAdminPositionLabel } from "@/lib/admin"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Loader2 } from "lucide-react"

type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

type RenderableReportComment = ReportComment & {
  author_name: string
  author_position_label: string
}

interface ReportCommentsThreadProps {
  reportId: string
  authorRole: "student" | "admin"
  className?: string
  variant?: "default" | "dark"
}

function isMissingReportCommentsColumnError(error?: SupabaseLikeError | null, columnName?: string) {
  const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase()
  const missingColumnMatch = columnName ? message.includes(columnName.toLowerCase()) : true

  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    (message.includes("schema cache") && missingColumnMatch) ||
    (message.includes("column") && missingColumnMatch)
  )
}

export function ReportCommentsThread({
  reportId,
  authorRole,
  className,
  variant = "default",
}: ReportCommentsThreadProps) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [comments, setComments] = useState<RenderableReportComment[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [content, setContent] = useState("")
  const [error, setError] = useState("")
  const [featureUnavailable, setFeatureUnavailable] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentAdminName, setCurrentAdminName] = useState("Administrator")
  const [currentAdminPosition, setCurrentAdminPosition] = useState<string | null>(null)

  const isDark = variant === "dark"

  const loadComments = async () => {
    setLoading(true)
    setError("")

    let data: ReportComment[] | null = null
    let fetchError: SupabaseLikeError | null = null

    const initialResponse = await supabase
      .from("report_comments")
      .select("id, report_id, author_id, author_role, author_name, author_position, content, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true })

    data = (initialResponse.data as ReportComment[] | null) || null
    fetchError = initialResponse.error

    if (
      isMissingReportCommentsColumnError(fetchError, "author_position") ||
      isMissingReportCommentsColumnError(fetchError, "author_name")
    ) {
      const authorNameFallback = await supabase
        .from("report_comments")
        .select("id, report_id, author_id, author_role, author_name, content, created_at")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true })

      data = (authorNameFallback.data as ReportComment[] | null) || null
      fetchError = authorNameFallback.error
    }

    if (isMissingReportCommentsColumnError(fetchError, "author_name")) {
      const legacyFallback = await supabase
        .from("report_comments")
        .select("id, report_id, author_id, author_role, content, created_at")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true })

      data = (legacyFallback.data as ReportComment[] | null) || null
      fetchError = legacyFallback.error
    }

    if (fetchError) {
      if (fetchError.code === "42P01") {
        setFeatureUnavailable(true)
        setComments([])
      } else {
        setError("Failed to load comments.")
      }
      setLoading(false)
      return
    }

    const rawComments = data || []
    const studentAuthorIds = [
      ...new Set(rawComments.filter((comment) => comment.author_role === "student").map((comment) => comment.author_id)),
    ].filter((id): id is string => Boolean(id))

    const profileById = new Map<string, string>()
    if (studentAuthorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", studentAuthorIds)

      profiles?.forEach((profile) => {
        const fullName = [profile.first_name, profile.last_name]
          .filter((name): name is string => Boolean(name))
          .join(" ")
          .trim()

        profileById.set(profile.id, fullName || "Student")
      })
    }

    setComments(
      rawComments.map((comment) => ({
        ...comment,
        author_name:
          comment.author_role === "admin"
            ? comment.author_name?.trim() ||
              (comment.author_id && comment.author_id === currentUserId ? currentAdminName : "Administrator")
            : comment.author_id
              ? profileById.get(comment.author_id) || "Student"
              : "Student",
        author_position_label:
          comment.author_role === "admin"
            ? (comment.author_id && comment.author_id === currentUserId ? currentAdminPosition?.trim() || null : null) ||
              comment.author_position?.trim() ||
              "Administrator"
            : "Student",
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    const loadCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setCurrentUserId(null)
        setCurrentAdminName("Administrator")
        setCurrentAdminPosition(null)
        return
      }

      setCurrentUserId(user.id)

      if (authorRole === "admin") {
        const userEmail = (user.email || "").trim().toLowerCase()
        const { data: adminAccount } = await supabase
          .from("admin_accounts")
          .select("full_name, position")
          .eq("email", userEmail)
          .eq("is_active", true)
          .maybeSingle()

        const displayName = adminAccount?.full_name?.trim() || user.user_metadata?.full_name?.trim() || "Administrator"
        const displayPosition = getAdminPositionLabel(adminAccount?.position, userEmail)
        setCurrentAdminName(displayName)
        setCurrentAdminPosition(displayPosition)
        return
      }

      setCurrentAdminName("Administrator")
      setCurrentAdminPosition(null)
    }

    loadCurrentUser()
  }, [authorRole, supabase])

  useEffect(() => {
    loadComments()

    const channel = supabase
      .channel(`report-comments-${reportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "report_comments", filter: `report_id=eq.${reportId}` },
        loadComments,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, currentUserId, currentAdminName, currentAdminPosition])

  const submitComment = async () => {
    if (!content.trim()) return

    setPosting(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      setError("Your session expired. Sign in again to post a comment.")
      setPosting(false)
      return
    }

    const baseInsertPayload = {
      report_id: reportId,
      author_id: user.id,
      author_role: authorRole,
      content: content.trim(),
    }

    let { error: insertError } = await supabase.from("report_comments").insert({
      ...baseInsertPayload,
      author_name: authorRole === "admin" ? currentAdminName : null,
      author_position: authorRole === "admin" ? currentAdminPosition?.trim() || null : null,
    })

    if (
      isMissingReportCommentsColumnError(insertError, "author_position") ||
      isMissingReportCommentsColumnError(insertError, "author_name")
    ) {
      const authorNameFallback = await supabase.from("report_comments").insert({
        ...baseInsertPayload,
        author_name: authorRole === "admin" ? currentAdminName : null,
      })
      insertError = authorNameFallback.error
    }

    if (isMissingReportCommentsColumnError(insertError, "author_name")) {
      const legacyFallback = await supabase.from("report_comments").insert(baseInsertPayload)
      insertError = legacyFallback.error
    }

    if (insertError) {
      if (insertError.code === "42P01") {
        setFeatureUnavailable(true)
      } else {
        setError("Failed to post comment.")
      }
      setPosting(false)
      return
    }

    setContent("")
    await loadComments()
    setPosting(false)
  }

  if (featureUnavailable) {
    return (
      <div className={className}>
        <p className={`text-xs ${isDark ? "text-amber-300" : "text-amber-700"}`}>
          Comments are unavailable. Create a `report_comments` table in Supabase to enable this feature.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-muted-foreground"}`} />
        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-foreground"}`}>Comments</p>
      </div>

      <div
        className={`rounded-lg p-3 space-y-2 max-h-56 overflow-y-auto ${
          isDark ? "bg-slate-700/30 border border-slate-600" : "bg-muted/40 border border-border"
        }`}
      >
        {loading ? (
          <div className={`text-xs ${isDark ? "text-slate-300" : "text-muted-foreground"}`}>Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className={`text-xs ${isDark ? "text-slate-300" : "text-muted-foreground"}`}>
            No comments yet.
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-md px-2 py-1.5 ${
                isDark ? "bg-slate-700/70 text-slate-100" : "bg-background text-foreground"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{comment.author_name}</span>
                <span className={`text-[10px] ${isDark ? "text-slate-300" : "text-muted-foreground"}`}>
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className={`text-[10px] ${isDark ? "text-slate-300" : "text-muted-foreground"}`}>
                {comment.author_position_label}
              </p>
              <p className="text-xs mt-1 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-2 space-y-2">
        <Textarea
          placeholder={authorRole === "admin" ? "Write a response to the student..." : "Write a follow-up message..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={isDark ? "bg-slate-700/50 border-slate-600 text-white" : ""}
          rows={3}
        />
        {error && <p className={`text-xs ${isDark ? "text-red-300" : "text-destructive"}`}>{error}</p>}
        <Button type="button" onClick={submitComment} disabled={posting || !content.trim()} className="w-full sm:w-auto">
          {posting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            "Post Comment"
          )}
        </Button>
      </div>
    </div>
  )
}
