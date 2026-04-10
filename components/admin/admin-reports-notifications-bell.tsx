"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Heart, MessageSquare, ShieldCheck, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ToastAction } from "@/components/ui/toast"
import { toast } from "@/hooks/use-toast"
import { getAdminPositionLabel, isSuperAdminEmail, normalizeEmail } from "@/lib/admin"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  ADMIN_REPORTS_NOTIFICATIONS_EVENT,
  isAdminNotificationUnread,
  isAdminReportUnread,
  loadAdminReportsNotificationState,
  markAdminNotificationAsRead,
  markAdminReportAsRead,
  markAllAdminNotificationsAsRead,
  type AdminReportsNotificationState,
} from "@/lib/admin/report-notifications"
import { cn } from "@/lib/utils"

type ReportRow = {
  id: string
  user_id?: string | null
  bullying_type?: string | null
  status?: string | null
  created_at: string
  incident_date?: string | null
  details?: string | null
  reporter_name?: string | null
}

type ProfileRow = {
  id: string
  email?: string | null
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
}

type StudentAccountRow = {
  id: string
  email: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  lrn?: string | null
  student_id?: string | null
  school_id_url?: string | null
  created_at: string
}

type AdminAccountRow = {
  id: string
  full_name: string
  position?: string | null
  email: string
  is_active: boolean
  created_at: string
}

type ReportCommentRow = {
  id: string
  report_id: string
  author_id?: string | null
  author_role: "student" | "admin"
  author_name?: string | null
  content: string
  created_at: string
}

type AnnouncementLikeRow = {
  id: string
  announcement_id: string
  user_id: string
  created_at: string
}

type AnnouncementRow = {
  id: string
  title: string
  type: string
}

type ActivityItem =
  | {
      kind: "report_comment"
      key: string
      created_at: string
      comment_id: string
      report_id: string
      student_name: string
      content: string
      report_summary?: { bullying_type?: string | null; reporter_name?: string | null } | null
    }
  | {
      kind: "announcement_like"
      key: string
      created_at: string
      like_id: string
      announcement_id: string
      student_name: string
      announcement_title: string
      announcement_type?: string | null
    }

type AccountItem =
  | {
      kind: "student_account"
      key: string
      created_at: string
      account_id: string
      display_name: string
      email: string
      identifier?: string | null
      has_school_id: boolean
    }
  | {
      kind: "admin_account"
      key: string
      created_at: string
      account_id: string
      display_name: string
      email: string
      position?: string | null
      is_active: boolean
    }

type NotificationSection = "reports" | "activity" | "accounts"

const REPORT_LIMIT = 15
const ACTIVITY_LIMIT = 10
const ACCOUNT_LIMIT = 10
const STUDENT_ACCOUNT_FETCH_LIMIT = 20
const POLL_INTERVAL_MS = 5_000

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
  if (normalized.length <= 160) return normalized
  return `${normalized.slice(0, 160)}...`
}

function formatReporterName(profile?: ProfileRow | null) {
  const fullName =
    profile?.full_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter((name): name is string => Boolean(name)).join(" ").trim()

  return fullName || null
}

function getStudentAccountIdentifier(profile: StudentAccountRow) {
  return profile.lrn?.trim() || profile.student_id?.trim() || null
}

function isStudentAccountProfile(profile: StudentAccountRow) {
  return Boolean(getStudentAccountIdentifier(profile) || profile.school_id_url?.trim())
}

function formatStudentAccountName(profile: StudentAccountRow) {
  return formatReporterName(profile) || normalizeEmail(profile.email).split("@")[0] || "Student"
}

function sortByCreatedAtAscending<T extends { created_at: string }>(items: T[]) {
  return [...items].sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
}

function getAccountItemHref(item: AccountItem) {
  return item.kind === "admin_account" ? "/admin/admin-accounts" : "/admin/account-management"
}

export function AdminReportsNotificationsBell() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])

  const [isOpen, setIsOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<NotificationSection>("reports")
  const [reports, setReports] = useState<ReportRow[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  const [notificationState, setNotificationState] = useState<AdminReportsNotificationState>(() =>
    loadAdminReportsNotificationState(),
  )

  const notificationStateRef = useRef(notificationState)
  const knownReportIdsRef = useRef<Set<string>>(new Set())
  const knownCommentIdsRef = useRef<Set<string>>(new Set())
  const knownLikeIdsRef = useRef<Set<string>>(new Set())
  const knownStudentAccountIdsRef = useRef<Set<string>>(new Set())
  const knownAdminAccountIdsRef = useRef<Set<string>>(new Set())
  const currentUserIdRef = useRef<string | null>(null)
  const canViewAdminAccounts = isSuperAdminEmail(currentUserEmail)

  useEffect(() => {
    const loadCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      currentUserIdRef.current = user?.id || null
      const nextEmail = normalizeEmail(user?.email)
      setCurrentUserEmail(nextEmail || null)
    }

    void loadCurrentUser()
  }, [supabase])

  useEffect(() => {
    notificationStateRef.current = notificationState
  }, [notificationState])

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<AdminReportsNotificationState>).detail
      if (!next) return
      setNotificationState(next)
    }

    window.addEventListener(ADMIN_REPORTS_NOTIFICATIONS_EVENT, handler)
    return () => {
      window.removeEventListener(ADMIN_REPORTS_NOTIFICATIONS_EVENT, handler)
    }
  }, [])

  const unreadReportsCount = reports.reduce((count, report) => {
    const unread = isAdminReportUnread(report.id, report.created_at, notificationState)
    return count + (unread ? 1 : 0)
  }, 0)

  const unreadActivityCount = activity.reduce((count, item) => {
    const unread = isAdminNotificationUnread(item.key, item.created_at, notificationState)
    return count + (unread ? 1 : 0)
  }, 0)

  const unreadAccountsCount = accounts.reduce((count, item) => {
    const unread = isAdminNotificationUnread(item.key, item.created_at, notificationState)
    return count + (unread ? 1 : 0)
  }, 0)

  const unreadCount = unreadReportsCount + unreadActivityCount + unreadAccountsCount
  const sortedReports = useMemo(() => sortByCreatedAtAscending(reports), [reports])
  const sortedActivity = useMemo(() => sortByCreatedAtAscending(activity), [activity])
  const sortedAccounts = useMemo(() => sortByCreatedAtAscending(accounts), [accounts])

  const ensureBaselineReadAt = (latestCreatedAt?: string | null) => {
    const current = notificationStateRef.current
    if (current.lastReadAt) return

    const next = markAllAdminNotificationsAsRead(latestCreatedAt)
    setNotificationState(next)
  }

  const enrichReports = async (rows: ReportRow[]) => {
    const userIds = [...new Set(rows.map((report) => report.user_id).filter(Boolean))] as string[]
    const profileById = new Map<string, ProfileRow>()

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .in("id", userIds)

      profiles?.forEach((profile) => profileById.set(profile.id, profile))
    }

    return rows.map((report) => {
      const nameFromProfile = report.user_id ? formatReporterName(profileById.get(report.user_id) || null) : null
      const reporterName = report.reporter_name?.trim() || nameFromProfile || "Unknown Student"

      return {
        ...report,
        reporter_name: reporterName,
      }
    })
  }

  const enrichStudentCommentActivity = async (rows: ReportCommentRow[]) => {
    const comments = rows.filter((comment) => comment.author_role === "student")
    if (comments.length === 0) return [] as Extract<ActivityItem, { kind: "report_comment" }>[]

    const studentAuthorIds = [
      ...new Set(comments.map((comment) => comment.author_id).filter((id): id is string => Boolean(id))),
    ]
    const reportIds = [...new Set(comments.map((comment) => comment.report_id))]

    const studentNameById = new Map<string, string>()
    if (studentAuthorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .in("id", studentAuthorIds)

      profiles?.forEach((profile) => {
        studentNameById.set(profile.id, formatReporterName(profile) || "Student")
      })
    }

    const reportSummaryById = new Map<string, { bullying_type?: string | null; reporter_name?: string | null }>()
    if (reportIds.length > 0) {
      const { data: reportsData } = await supabase.from("reports").select("id, bullying_type, reporter_name").in("id", reportIds)

      reportsData?.forEach((report) => {
        reportSummaryById.set(report.id, { bullying_type: report.bullying_type, reporter_name: report.reporter_name })
      })
    }

    return comments.map((comment) => ({
      kind: "report_comment",
      key: `comment:${comment.id}`,
      created_at: comment.created_at,
      comment_id: comment.id,
      report_id: comment.report_id,
      student_name:
        (comment.author_id ? studentNameById.get(comment.author_id) : null) || comment.author_name?.trim() || "Student",
      content: comment.content,
      report_summary: reportSummaryById.get(comment.report_id) || null,
    })) as Extract<ActivityItem, { kind: "report_comment" }>[]
  }

  const enrichAnnouncementLikeActivity = async (rows: AnnouncementLikeRow[]) => {
    if (rows.length === 0) return [] as Extract<ActivityItem, { kind: "announcement_like" }>[]

    const userIds = [...new Set(rows.map((row) => row.user_id))]
    const announcementIds = [...new Set(rows.map((row) => row.announcement_id))]

    const studentNameById = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .in("id", userIds)

      profiles?.forEach((profile) => {
        studentNameById.set(profile.id, formatReporterName(profile) || "Student")
      })
    }

    const announcementById = new Map<string, AnnouncementRow>()
    if (announcementIds.length > 0) {
      const { data: announcements } = await supabase.from("announcements").select("id, title, type").in("id", announcementIds)
      announcements?.forEach((announcement) => announcementById.set(announcement.id, announcement as AnnouncementRow))
    }

    return rows.map((like) => {
      const announcement = announcementById.get(like.announcement_id)
      return {
        kind: "announcement_like",
        key: `like:${like.id}`,
        created_at: like.created_at,
        like_id: like.id,
        announcement_id: like.announcement_id,
        student_name: studentNameById.get(like.user_id) || "Student",
        announcement_title: announcement?.title || "Post",
        announcement_type: announcement?.type || null,
      }
    }) as Extract<ActivityItem, { kind: "announcement_like" }>[]
  }

  const enrichStudentAccountItems = (rows: StudentAccountRow[]) => {
    return rows
      .filter(isStudentAccountProfile)
      .map((account) => ({
        kind: "student_account",
        key: `student-account:${account.id}`,
        created_at: account.created_at,
        account_id: account.id,
        display_name: formatStudentAccountName(account),
        email: normalizeEmail(account.email),
        identifier: getStudentAccountIdentifier(account),
        has_school_id: Boolean(account.school_id_url?.trim()),
      })) as Extract<AccountItem, { kind: "student_account" }>[]
  }

  const enrichAdminAccountItems = (rows: AdminAccountRow[]) => {
    return rows.map((account) => ({
      kind: "admin_account",
      key: `admin-account:${account.id}`,
      created_at: account.created_at,
      account_id: account.id,
      display_name: account.full_name?.trim() || normalizeEmail(account.email).split("@")[0] || "Admin",
      email: normalizeEmail(account.email),
      position: account.position,
      is_active: account.is_active,
    })) as Extract<AccountItem, { kind: "admin_account" }>[]
  }

  const showNewReportToast = (report: ReportRow) => {
    const bullyingType = report.bullying_type || "Unknown"
    const bullyingTypeLabel = bullyingTypeLabels[bullyingType] || bullyingType
    const preview = getTextPreview(report.details)
    const reporterName = report.reporter_name?.trim() || "Unknown Student"

    let dismissToast: (() => void) | undefined

    const toastResult = toast({
      title: "New report received",
      description: (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">{bullyingTypeLabel}</span>{" "}
            <span className="text-muted-foreground">- {reporterName}</span>
          </div>
          <div className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString()}</div>
          {preview ? <div className="text-sm text-muted-foreground line-clamp-2">{preview}</div> : null}
        </div>
      ),
      action: (
        <ToastAction
          altText="View report"
          onClick={() => {
            dismissToast?.()
            setNotificationState(markAdminReportAsRead(report.id, report.created_at))
            router.push(`/admin/reports?reportId=${encodeURIComponent(report.id)}`)
          }}
        >
          View
        </ToastAction>
      ),
    })

    dismissToast = toastResult.dismiss
  }

  const showNewAccountToast = (item: AccountItem) => {
    let dismissToast: (() => void) | undefined

    const title = item.kind === "admin_account" ? "New admin account added" : "New student account added"
    const subtitle =
      item.kind === "admin_account"
        ? getAdminPositionLabel(item.position, item.email)
        : item.identifier
          ? `LRN: ${item.identifier}`
          : "Student account"
    const meta =
      item.kind === "admin_account"
        ? item.is_active
          ? item.email
          : `${item.email} - Inactive`
        : item.has_school_id
          ? `${item.email} - School ID attached`
          : item.email

    const toastResult = toast({
      title,
      description: (
        <div className="space-y-1">
          <div className="text-sm font-medium">{item.display_name}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
          <div className="text-xs text-muted-foreground">{meta}</div>
        </div>
      ),
      action: (
        <ToastAction
          altText="Open accounts"
          onClick={() => {
            dismissToast?.()
            setNotificationState(markAdminNotificationAsRead(item.key, item.created_at))
            router.push(getAccountItemHref(item))
          }}
        >
          Open
        </ToastAction>
      ),
    })

    dismissToast = toastResult.dismiss
  }

  const showStudentCommentToast = (item: Extract<ActivityItem, { kind: "report_comment" }>) => {
    const bullyingType = item.report_summary?.bullying_type || null
    const bullyingTypeLabel = bullyingType ? bullyingTypeLabels[bullyingType] || bullyingType : "a report"
    const reportReporterName = item.report_summary?.reporter_name?.trim() || "Unknown Student"
    const preview = getTextPreview(item.content)

    let dismissToast: (() => void) | undefined

    const toastResult = toast({
      title: "New student comment",
      description: (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">{item.student_name}</span>{" "}
            <span className="text-muted-foreground">
              commented on {bullyingTypeLabel} - {reportReporterName}
            </span>
          </div>
          {preview ? <div className="text-sm text-muted-foreground line-clamp-2">{preview}</div> : null}
        </div>
      ),
      action: (
        <ToastAction
          altText="Open report"
          onClick={() => {
            dismissToast?.()
            setNotificationState(markAdminNotificationAsRead(item.key, item.created_at))
            router.push(`/admin/reports?reportId=${encodeURIComponent(item.report_id)}`)
          }}
        >
          Open
        </ToastAction>
      ),
    })

    dismissToast = toastResult.dismiss
  }

  const showAnnouncementLikeToast = (item: Extract<ActivityItem, { kind: "announcement_like" }>) => {
    let dismissToast: (() => void) | undefined

    const toastResult = toast({
      title: "New like on a post",
      description: (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">{item.student_name}</span>{" "}
            <span className="text-muted-foreground">liked "{item.announcement_title}"</span>
          </div>
        </div>
      ),
      action: (
        <ToastAction
          altText="Open post"
          onClick={() => {
            dismissToast?.()
            setNotificationState(markAdminNotificationAsRead(item.key, item.created_at))
            router.push(`/admin/content?announcementId=${encodeURIComponent(item.announcement_id)}`)
          }}
        >
          Open
        </ToastAction>
      ),
    })

    dismissToast = toastResult.dismiss
  }

  const upsertReports = (nextReports: ReportRow[]) => {
    setReports((prev) => {
      const existingIds = new Set(prev.map((r) => r.id))
      const merged = [...nextReports.filter((r) => !existingIds.has(r.id)), ...prev].slice(0, REPORT_LIMIT)
      merged.forEach((report) => knownReportIdsRef.current.add(report.id))
      return merged
    })
  }

  const upsertActivity = (nextItems: ActivityItem[]) => {
    setActivity((prev) => {
      const existingKeys = new Set(prev.map((item) => item.key))
      const merged = [...nextItems.filter((item) => !existingKeys.has(item.key)), ...prev].slice(0, ACTIVITY_LIMIT)
      return merged
    })
  }

  const upsertAccounts = (nextItems: AccountItem[]) => {
    setAccounts((prev) => {
      const existingKeys = new Set(prev.map((item) => item.key))
      const merged = [...nextItems.filter((item) => !existingKeys.has(item.key)), ...prev]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, ACCOUNT_LIMIT)

      merged.forEach((item) => {
        if (item.kind === "student_account") {
          knownStudentAccountIdsRef.current.add(item.account_id)
        } else {
          knownAdminAccountIdsRef.current.add(item.account_id)
        }
      })

      return merged
    })
  }

  useEffect(() => {
    let isCancelled = false

    const fetchRecent = async () => {
      const [reportsResponse, commentsResponse, likesResponse, studentAccountsResponse] = await Promise.all([
        supabase
          .from("reports")
          .select("id, user_id, bullying_type, status, created_at, incident_date, details, reporter_name")
          .order("created_at", { ascending: false })
          .limit(REPORT_LIMIT),
        supabase
          .from("report_comments")
          .select("id, report_id, author_id, author_role, content, created_at")
          .eq("author_role", "student")
          .order("created_at", { ascending: false })
          .limit(ACTIVITY_LIMIT),
        supabase
          .from("announcement_likes")
          .select("id, announcement_id, user_id, created_at")
          .order("created_at", { ascending: false })
          .limit(ACTIVITY_LIMIT),
        supabase
          .from("profiles")
          .select("id, email, full_name, first_name, last_name, lrn, student_id, school_id_url, created_at")
          .order("created_at", { ascending: false })
          .limit(STUDENT_ACCOUNT_FETCH_LIMIT),
      ])

      if (isCancelled) return

      let adminAccountsData: AdminAccountRow[] = []
      if (canViewAdminAccounts) {
        const { data } = await supabase
          .from("admin_accounts")
          .select("id, full_name, position, email, is_active, created_at")
          .order("created_at", { ascending: false })
          .limit(ACCOUNT_LIMIT)

        adminAccountsData = (data as AdminAccountRow[] | null) || []
      }

      if (isCancelled) return

      const reportsData = (reportsResponse.data as ReportRow[] | null) || []
      const commentsData = (commentsResponse.error?.code === "42P01"
        ? []
        : ((commentsResponse.data as ReportCommentRow[] | null) || [])) as ReportCommentRow[]
      const likesData = (likesResponse.error?.code === "42P01"
        ? []
        : ((likesResponse.data as AnnouncementLikeRow[] | null) || [])) as AnnouncementLikeRow[]
      const studentAccountsData = (studentAccountsResponse.data as StudentAccountRow[] | null) || []

      const [enrichedReports, commentItems, likeItems] = await Promise.all([
        enrichReports(reportsData),
        enrichStudentCommentActivity(commentsData),
        enrichAnnouncementLikeActivity(likesData),
      ])

      if (isCancelled) return

      enrichedReports.forEach((report) => knownReportIdsRef.current.add(report.id))
      setReports(enrichedReports)

      const combinedActivity = [...commentItems, ...likeItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, ACTIVITY_LIMIT)

      combinedActivity.forEach((item) => {
        if (item.kind === "report_comment") {
          knownCommentIdsRef.current.add(item.comment_id)
        } else {
          knownLikeIdsRef.current.add(item.like_id)
        }
      })

      setActivity(combinedActivity)

      const combinedAccounts = [...enrichAdminAccountItems(adminAccountsData), ...enrichStudentAccountItems(studentAccountsData)]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, ACCOUNT_LIMIT)

      combinedAccounts.forEach((item) => {
        if (item.kind === "student_account") {
          knownStudentAccountIdsRef.current.add(item.account_id)
        } else {
          knownAdminAccountIdsRef.current.add(item.account_id)
        }
      })

      setAccounts(combinedAccounts)

      const latestCandidate = [enrichedReports[0]?.created_at, combinedActivity[0]?.created_at, combinedAccounts[0]?.created_at]
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]

      ensureBaselineReadAt(latestCandidate || null)
    }

    void fetchRecent()

    return () => {
      isCancelled = true
    }
  }, [canViewAdminAccounts, supabase])

  useEffect(() => {
    const channel = supabase
      .channel("admin-reports-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, async (payload) => {
        const report = payload.new as ReportRow
        if (!report?.id) return
        if (knownReportIdsRef.current.has(report.id)) return

        const enriched = (await enrichReports([report]))[0]
        if (!enriched) return

        knownReportIdsRef.current.add(enriched.id)
        upsertReports([enriched])

        showNewReportToast(enriched)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    const channel = supabase
      .channel("admin-report-comments-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "report_comments", filter: "author_role=eq.student" },
        async (payload) => {
          const comment = payload.new as ReportCommentRow
          if (!comment?.id) return
          if (comment.author_id && comment.author_id === currentUserIdRef.current) return
          if (knownCommentIdsRef.current.has(comment.id)) return

          const item = (await enrichStudentCommentActivity([comment]))[0]
          if (!item) return

          knownCommentIdsRef.current.add(item.comment_id)
          upsertActivity([item])
          showStudentCommentToast(item)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    const channel = supabase
      .channel("admin-announcement-likes-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcement_likes" }, async (payload) => {
        const like = payload.new as AnnouncementLikeRow
        if (!like?.id) return
        if (like.user_id === currentUserIdRef.current) return
        if (knownLikeIdsRef.current.has(like.id)) return

        const item = (await enrichAnnouncementLikeActivity([like]))[0]
        if (!item) return

        knownLikeIdsRef.current.add(item.like_id)
        upsertActivity([item])
        showAnnouncementLikeToast(item)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    const channel = supabase
      .channel("admin-student-account-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
        const account = payload.new as StudentAccountRow
        if (!account?.id) return
        if (knownStudentAccountIdsRef.current.has(account.id)) return
        if (!isStudentAccountProfile(account)) return

        const item = enrichStudentAccountItems([account])[0]
        if (!item) return

        knownStudentAccountIdsRef.current.add(item.account_id)
        upsertAccounts([item])
        showNewAccountToast(item)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    if (!canViewAdminAccounts) return

    const channel = supabase
      .channel("admin-admin-account-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_accounts" }, (payload) => {
        const account = payload.new as AdminAccountRow
        if (!account?.id) return
        if (knownAdminAccountIdsRef.current.has(account.id)) return

        const item = enrichAdminAccountItems([account])[0]
        if (!item) return

        knownAdminAccountIdsRef.current.add(item.account_id)
        upsertAccounts([item])
        showNewAccountToast(item)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [canViewAdminAccounts, supabase])

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, user_id, bullying_type, status, created_at, incident_date, details, reporter_name")
        .order("created_at", { ascending: false })
        .limit(1)

      const latest = (data?.[0] as ReportRow | undefined) || null
      if (!latest?.id) return
      if (knownReportIdsRef.current.has(latest.id)) return

      const enriched = (await enrichReports([latest]))[0]
      if (!enriched) return

      knownReportIdsRef.current.add(enriched.id)
      upsertReports([enriched])

      showNewReportToast(enriched)
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [supabase])

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: studentRows } = await supabase
        .from("profiles")
        .select("id, email, full_name, first_name, last_name, lrn, student_id, school_id_url, created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      let latestAccount: AccountItem | null = null

      const latestStudentAccount = enrichStudentAccountItems((studentRows as StudentAccountRow[] | null) || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

      if (latestStudentAccount && !knownStudentAccountIdsRef.current.has(latestStudentAccount.account_id)) {
        latestAccount = latestStudentAccount
      }

      if (canViewAdminAccounts) {
        const { data: adminRows } = await supabase
          .from("admin_accounts")
          .select("id, full_name, position, email, is_active, created_at")
          .order("created_at", { ascending: false })
          .limit(1)

        const latestAdminAccount = enrichAdminAccountItems((adminRows as AdminAccountRow[] | null) || [])[0]
        if (
          latestAdminAccount &&
          !knownAdminAccountIdsRef.current.has(latestAdminAccount.account_id) &&
          (!latestAccount || new Date(latestAdminAccount.created_at).getTime() > new Date(latestAccount.created_at).getTime())
        ) {
          latestAccount = latestAdminAccount
        }
      }

      if (!latestAccount) return

      if (latestAccount.kind === "student_account") {
        knownStudentAccountIdsRef.current.add(latestAccount.account_id)
      } else {
        knownAdminAccountIdsRef.current.add(latestAccount.account_id)
      }

      upsertAccounts([latestAccount])
      showNewAccountToast(latestAccount)
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [canViewAdminAccounts, supabase])

  const markAllAsRead = () => {
    const latestCandidate = [activity[0]?.created_at, reports[0]?.created_at, accounts[0]?.created_at]
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]

    setNotificationState(markAllAdminNotificationsAsRead(latestCandidate || null))
  }

  const openReport = (report: ReportRow) => {
    setNotificationState(markAdminReportAsRead(report.id, report.created_at))
    setIsOpen(false)
    router.push(`/admin/reports?reportId=${encodeURIComponent(report.id)}`)
  }

  const openActivityItem = (item: ActivityItem) => {
    setNotificationState(markAdminNotificationAsRead(item.key, item.created_at))
    setIsOpen(false)

    if (item.kind === "report_comment") {
      router.push(`/admin/reports?reportId=${encodeURIComponent(item.report_id)}`)
      return
    }

    router.push(`/admin/content?announcementId=${encodeURIComponent(item.announcement_id)}`)
  }

  const openAccountItem = (item: AccountItem) => {
    setNotificationState(markAdminNotificationAsRead(item.key, item.created_at))
    setIsOpen(false)
    router.push(getAccountItemHref(item))
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white/70 hover:text-white/95 hover:bg-white/10">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white" />
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="flex h-[36rem] w-96 max-h-[calc(100dvh-5rem)] flex-col overflow-hidden border-slate-700 bg-slate-800 p-0 text-white"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="text-slate-200 hover:text-white hover:bg-slate-700"
          >
            Mark all as read
          </Button>
        </div>

        {reports.length === 0 && activity.length === 0 && accounts.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-slate-400">No notifications yet</div>
        ) : (
          <>
            <div className="border-b border-slate-700 px-2 py-2">
              <div className="flex gap-1 overflow-x-auto">
                {[
                  { key: "reports", label: "Recent Reports" },
                  { key: "activity", label: "Activities" },
                  { key: "accounts", label: "Accounts" },
                ].map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setSelectedSection(section.key as NotificationSection)}
                    className={cn(
                      "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      selectedSection === section.key
                        ? "bg-cyan-500/20 text-cyan-200"
                        : "bg-slate-700/40 text-slate-300 hover:bg-slate-700/70 hover:text-white",
                    )}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 touch-pan-y">
              <div className="pr-1">
                {selectedSection === "activity" && (
                  <div>
                <p className="px-1 text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Activity</p>
                {activity.length === 0 ? (
                  <div className="px-1 py-2 text-sm text-slate-400">No recent activity</div>
                ) : (
                  <div className="mt-1 space-y-1">
                    {sortedActivity.map((item) => {
                      const unread = isAdminNotificationUnread(item.key, item.created_at, notificationState)

                      const title =
                        item.kind === "report_comment"
                          ? (() => {
                              const bullyingType = item.report_summary?.bullying_type || null
                              const bullyingTypeLabel = bullyingType
                                ? bullyingTypeLabels[bullyingType] || bullyingType
                                : "a report"
                              return `Comment on ${bullyingTypeLabel}`
                            })()
                          : `Like on "${item.announcement_title}"`

                      const subtitle =
                        item.kind === "report_comment"
                          ? (() => {
                              const reportReporterName = item.report_summary?.reporter_name?.trim() || "Unknown Student"
                              return `${item.student_name} - ${reportReporterName}`
                            })()
                          : item.student_name

                      const preview = item.kind === "report_comment" ? getTextPreview(item.content) : ""
                      const Icon = item.kind === "report_comment" ? MessageSquare : Heart
                      const iconColor = item.kind === "report_comment" ? "text-cyan-300" : "text-pink-300"

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => openActivityItem(item)}
                          className={cn(
                            "w-full text-left rounded-md px-2.5 py-2 transition-colors hover:bg-slate-700/60 border border-transparent",
                            unread ? "bg-cyan-500/10 border-cyan-500/30" : "bg-slate-900/10",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 p-1.5 rounded bg-slate-700/50">
                              <Icon className={`w-4 h-4 ${iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium truncate">
                                  {title}{" "}
                                  {unread ? <span className="ml-1 text-xs text-cyan-300 align-middle">(new)</span> : null}
                                </p>
                                <p className="text-[11px] text-slate-400 whitespace-nowrap">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="text-xs text-slate-400 truncate">{subtitle}</p>
                              {preview ? <p className="mt-1 text-sm text-slate-300 line-clamp-2">{preview}</p> : null}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                  </div>
                )}

                {selectedSection === "reports" && (
                  <div>
                <p className="px-1 text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Recent Reports</p>
                {reports.length === 0 ? (
                  <div className="px-1 py-2 text-sm text-slate-400">No reports yet</div>
                ) : (
                  <div className="mt-1 space-y-1">
                    {sortedReports.map((report) => {
                      const unread = isAdminReportUnread(report.id, report.created_at, notificationState)
                      const bullyingType = report.bullying_type || "Unknown"
                      const bullyingTypeLabel = bullyingTypeLabels[bullyingType] || bullyingType
                      const preview = getTextPreview(report.details)
                      const reporterName = report.reporter_name?.trim() || "Unknown Student"

                      return (
                        <button
                          key={report.id}
                          type="button"
                          onClick={() => openReport(report)}
                          className={cn(
                            "w-full text-left rounded-md px-2.5 py-2 transition-colors hover:bg-slate-700/60 border border-transparent",
                            unread ? "bg-cyan-500/10 border-cyan-500/30" : "bg-slate-900/10",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {bullyingTypeLabel}{" "}
                                {unread ? <span className="ml-1 text-xs text-cyan-300 align-middle">(new)</span> : null}
                              </p>
                              <p className="text-xs text-slate-400 truncate">{reporterName}</p>
                            </div>
                            <p className="text-[11px] text-slate-400 whitespace-nowrap">
                              {new Date(report.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {preview ? <p className="mt-1 text-sm text-slate-300 line-clamp-2">{preview}</p> : null}
                        </button>
                      )
                    })}
                  </div>
                )}
                  </div>
                )}

                {selectedSection === "accounts" && (
                  <div>
                <p className="px-1 text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Accounts</p>
                {accounts.length === 0 ? (
                  <div className="px-1 py-2 text-sm text-slate-400">No recent account activity</div>
                ) : (
                  <div className="mt-1 space-y-1">
                    {sortedAccounts.map((item) => {
                      const unread = isAdminNotificationUnread(item.key, item.created_at, notificationState)
                      const title = item.display_name
                      const subtitle =
                        item.kind === "admin_account"
                          ? `Admin - ${getAdminPositionLabel(item.position, item.email)}`
                          : item.identifier
                            ? `Student - LRN ${item.identifier}`
                            : "Student account"
                      const preview =
                        item.kind === "admin_account"
                          ? item.is_active
                            ? item.email
                            : `${item.email} - Inactive`
                          : item.has_school_id
                            ? `${item.email} - School ID attached`
                            : item.email
                      const Icon = item.kind === "admin_account" ? ShieldCheck : UserPlus
                      const iconColor = item.kind === "admin_account" ? "text-emerald-300" : "text-violet-300"

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => openAccountItem(item)}
                          className={cn(
                            "w-full text-left rounded-md px-2.5 py-2 transition-colors hover:bg-slate-700/60 border border-transparent",
                            unread ? "bg-cyan-500/10 border-cyan-500/30" : "bg-slate-900/10",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 p-1.5 rounded bg-slate-700/50">
                              <Icon className={`w-4 h-4 ${iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium truncate">
                                  {title}{" "}
                                  {unread ? <span className="ml-1 text-xs text-cyan-300 align-middle">(new)</span> : null}
                                </p>
                                <p className="text-[11px] text-slate-400 whitespace-nowrap">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="text-xs text-slate-400 truncate">{subtitle}</p>
                              <p className="mt-1 text-sm text-slate-300 truncate">{preview}</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
