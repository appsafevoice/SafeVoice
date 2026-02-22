"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { ReportComment } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Loader2 } from "lucide-react"

interface ReportCommentsThreadProps {
  reportId: string
  authorRole: "student" | "admin"
  className?: string
  variant?: "default" | "dark"
}

export function ReportCommentsThread({
  reportId,
  authorRole,
  className,
  variant = "default",
}: ReportCommentsThreadProps) {
  const supabase = createBrowserClient()
  const [comments, setComments] = useState<ReportComment[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [content, setContent] = useState("")
  const [error, setError] = useState("")
  const [featureUnavailable, setFeatureUnavailable] = useState(false)

  const isDark = variant === "dark"

  const loadComments = async () => {
    setLoading(true)
    setError("")

    const { data, error: fetchError } = await supabase
      .from("report_comments")
      .select("id, report_id, author_id, author_role, content, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true })

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

    setComments((data as ReportComment[]) || [])
    setLoading(false)
  }

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
  }, [reportId])

  const submitComment = async () => {
    if (!content.trim()) return

    setPosting(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from("report_comments").insert({
      report_id: reportId,
      author_id: user?.id || null,
      author_role: authorRole,
      content: content.trim(),
    })

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
                <span className="text-xs font-medium capitalize">{comment.author_role}</span>
                <span className={`text-[10px] ${isDark ? "text-slate-300" : "text-muted-foreground"}`}>
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
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
