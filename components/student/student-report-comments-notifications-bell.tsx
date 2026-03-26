"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToastAction } from "@/components/ui/toast"
import { toast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  STUDENT_REPORT_COMMENT_NOTIFICATIONS_EVENT,
  isStudentReportCommentUnread,
  loadStudentReportCommentNotificationState,
  markAllStudentReportCommentsAsRead,
  markStudentReportCommentAsRead,
  type StudentReportCommentNotificationState,
} from "@/lib/student/report-comment-notifications"
import { cn } from "@/lib/utils"

type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

type ReportRow = {
  id: string
  bullying_type?: string | null
}

type ReportCommentRow = {
  id: string
  report_id: string
  author_role: "student" | "admin"
  author_name?: string | null
  author_position?: string | null
  content: string
  created_at: string
}

type NotificationItem = {
  key: string
  comment_id: string
  report_id: string
  created_at: string
  admin_name: string
  admin_position: string
  content: string
  bullying_type?: string | null
}

const COMMENT_LIMIT = 15

const bullyingTypeLabels: Record<string, string> = {
  physical: "Physical",
  verbal: "Verbal",
  social: "Social",
  cyber: "Cyber",
  sexual: "Sexual",
  other: "Other",
}

function getTextPreview(text?: string | null) {
  const normalized = (text || "").replace(/\s+/g, " ").trim()
  if (!normalized) return ""
  if (normalized.length <= 140) return normalized
  return `${normalized.slice(0, 140)}...`
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

export function StudentReportCommentsNotificationsBell() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])

  const [isOpen, setIsOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [notificationState, setNotificationState] = useState<StudentReportCommentNotificationState>(() =>
    loadStudentReportCommentNotificationState(),
  )

  const notificationStateRef = useRef(notificationState)
  const reportIdsRef = useRef<Set<string>>(new Set())
  const knownCommentIdsRef = useRef<Set<string>>(new Set())
  const reportTypeByIdRef = useRef<Map<string, string | null>>(new Map())

  useEffect(() => {
    notificationStateRef.current = notificationState
  }, [notificationState])

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<StudentReportCommentNotificationState>).detail
      if (!next) return
      setNotificationState(next)
    }

    window.addEventListener(STUDENT_REPORT_COMMENT_NOTIFICATIONS_EVENT, handler)
    return () => {
      window.removeEventListener(STUDENT_REPORT_COMMENT_NOTIFICATIONS_EVENT, handler)
    }
  }, [])

  const unreadCount = items.reduce((count, item) => {
    const unread = isStudentReportCommentUnread(item.key, item.created_at, notificationState)
    return count + (unread ? 1 : 0)
  }, 0)

  const ensureBaselineReadAt = (latestCreatedAt?: string | null) => {
    const current = notificationStateRef.current
    if (current.lastReadAt) return

    const next = markAllStudentReportCommentsAsRead(latestCreatedAt)
    setNotificationState(next)
  }

  const buildNotificationItems = (rows: ReportCommentRow[]) =>
    rows
      .filter((comment) => comment.author_role === "admin")
      .map((comment) => ({
        key: `comment:${comment.id}`,
        comment_id: comment.id,
        report_id: comment.report_id,
        created_at: comment.created_at,
        admin_name: comment.author_name?.trim() || "Admin",
        admin_position: comment.author_position?.trim() || "Admin",
        content: comment.content,
        bullying_type: reportTypeByIdRef.current.get(comment.report_id) || null,
      }))
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, COMMENT_LIMIT)

  const upsertItems = (nextItems: NotificationItem[]) => {
    setItems((prev) => {
      const existingKeys = new Set(prev.map((item) => item.key))
      const merged = [...nextItems.filter((item) => !existingKeys.has(item.key)), ...prev]
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
        .slice(0, COMMENT_LIMIT)

      merged.forEach((item) => knownCommentIdsRef.current.add(item.comment_id))
      return merged
    })
  }

  const showAdminCommentToast = (item: NotificationItem) => {
    const bullyingType = item.bullying_type || null
    const bullyingTypeLabel = bullyingType ? bullyingTypeLabels[bullyingType] || bullyingType : "report"
    const preview = getTextPreview(item.content)

    let dismissToast: (() => void) | undefined

    const toastResult = toast({
      title: "New admin comment",
      description: (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">{item.admin_name}</span>{" "}
            <span className="text-muted-foreground">replied on your {bullyingTypeLabel.toLowerCase()} report</span>
          </div>
          {preview ? <div className="text-sm text-muted-foreground line-clamp-2">{preview}</div> : null}
        </div>
      ),
      action: (
        <ToastAction
          altText="Open report"
          onClick={() => {
            dismissToast?.()
            setNotificationState(markStudentReportCommentAsRead(item.key, item.created_at))
            router.push(`/profile/reports?reportId=${encodeURIComponent(item.report_id)}`)
          }}
        >
          Open
        </ToastAction>
      ),
    })

    dismissToast = toastResult.dismiss
  }

  useEffect(() => {
    let isCancelled = false

    const fetchInitial = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (isCancelled) return

      setCurrentUserId(user?.id || null)

      if (!user?.id) {
        setItems([])
        reportIdsRef.current = new Set()
        reportTypeByIdRef.current = new Map()
        return
      }

      const { data: reportsData } = await supabase
        .from("reports")
        .select("id, bullying_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (isCancelled) return

      const reportRows = (reportsData as ReportRow[] | null) || []
      const reportIds = reportRows.map((report) => report.id)

      reportIdsRef.current = new Set(reportIds)
      reportTypeByIdRef.current = new Map(reportRows.map((report) => [report.id, report.bullying_type || null]))

      if (reportIds.length === 0) {
        setItems([])
        ensureBaselineReadAt(null)
        return
      }

      let commentsData: ReportCommentRow[] | null = null
      let commentsError: SupabaseLikeError | null = null

      const initialResponse = await supabase
        .from("report_comments")
        .select("id, report_id, author_role, author_name, author_position, content, created_at")
        .eq("author_role", "admin")
        .in("report_id", reportIds)
        .order("created_at", { ascending: false })
        .limit(COMMENT_LIMIT)

      commentsData = (initialResponse.data as ReportCommentRow[] | null) || null
      commentsError = initialResponse.error

      if (
        isMissingReportCommentsColumnError(commentsError, "author_position") ||
        isMissingReportCommentsColumnError(commentsError, "author_name")
      ) {
        const authorNameFallback = await supabase
          .from("report_comments")
          .select("id, report_id, author_role, author_name, content, created_at")
          .eq("author_role", "admin")
          .in("report_id", reportIds)
          .order("created_at", { ascending: false })
          .limit(COMMENT_LIMIT)

        commentsData = (authorNameFallback.data as ReportCommentRow[] | null) || null
        commentsError = authorNameFallback.error
      }

      if (isMissingReportCommentsColumnError(commentsError, "author_name")) {
        const legacyFallback = await supabase
          .from("report_comments")
          .select("id, report_id, author_role, content, created_at")
          .eq("author_role", "admin")
          .in("report_id", reportIds)
          .order("created_at", { ascending: false })
          .limit(COMMENT_LIMIT)

        commentsData = (legacyFallback.data as ReportCommentRow[] | null) || null
        commentsError = legacyFallback.error
      }

      if (isCancelled || commentsError) return

      const nextItems = buildNotificationItems(commentsData || [])
      nextItems.forEach((item) => knownCommentIdsRef.current.add(item.comment_id))
      setItems(nextItems)
      ensureBaselineReadAt(nextItems[0]?.created_at || null)
    }

    void fetchInitial()

    return () => {
      isCancelled = true
    }
  }, [supabase])

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`student-reports-${currentUserId}-notifications-context`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports", filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          const report = payload.new as ReportRow
          if (!report?.id) return
          reportIdsRef.current.add(report.id)
          reportTypeByIdRef.current.set(report.id, report.bullying_type || null)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel("student-report-comments-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "report_comments", filter: "author_role=eq.admin" },
        (payload) => {
          const comment = payload.new as ReportCommentRow
          if (!comment?.id) return
          if (!reportIdsRef.current.has(comment.report_id)) return
          if (knownCommentIdsRef.current.has(comment.id)) return

          const item = buildNotificationItems([comment])[0]
          if (!item) return

          knownCommentIdsRef.current.add(item.comment_id)
          upsertItems([item])
          showAdminCommentToast(item)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, supabase])

  const markAllAsRead = () => {
    setNotificationState(markAllStudentReportCommentsAsRead(items[0]?.created_at || null))
  }

  const openItem = (item: NotificationItem) => {
    setNotificationState(markStudentReportCommentAsRead(item.key, item.created_at))
    setIsOpen(false)
    router.push(`/profile/reports?reportId=${encodeURIComponent(item.report_id)}`)
  }

  return (
    <div className="shrink-0">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative h-10 w-10 rounded-full border-border/70 bg-card/95 shadow-sm backdrop-blur hover:bg-accent"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" /> : null}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" sideOffset={10} className="w-80 p-0">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
              Mark all as read
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            <ScrollArea className="max-h-[380px]">
              <div className="space-y-1 p-2">
                {items.map((item) => {
                  const unread = isStudentReportCommentUnread(item.key, item.created_at, notificationState)
                  const bullyingTypeLabel = item.bullying_type ? bullyingTypeLabels[item.bullying_type] || item.bullying_type : "Report"
                  const preview = getTextPreview(item.content)

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => openItem(item)}
                      className={cn(
                        "w-full rounded-md border border-transparent px-2.5 py-2 text-left transition-colors hover:bg-accent",
                        unread ? "bg-primary/10 border-primary/20" : "bg-background",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 rounded bg-primary/10 p-1.5">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium">
                              {bullyingTypeLabel}{" "}
                              {unread ? <span className="ml-1 text-xs text-primary align-middle">(new)</span> : null}
                            </p>
                            <p className="whitespace-nowrap text-[11px] text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.admin_name} - {item.admin_position}
                          </p>
                          {preview ? <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{preview}</p> : null}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
