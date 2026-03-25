export type StudentReportCommentNotificationState = {
  lastReadAt: string | null
  readIds: string[]
}

export const STUDENT_REPORT_COMMENT_NOTIFICATIONS_EVENT = "sv:student-report-comment-notifications-state-changed"

const STORAGE_KEY = "sv_student_report_comment_notifications_v1"
const MAX_READ_IDS = 200

function normalizeNotificationKey(key: string) {
  const trimmed = key.trim()
  if (!trimmed) return ""
  return trimmed.includes(":") ? trimmed : `comment:${trimmed}`
}

function safeParseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function loadStudentReportCommentNotificationState(): StudentReportCommentNotificationState {
  if (typeof window === "undefined") return { lastReadAt: null, readIds: [] }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { lastReadAt: null, readIds: [] }

    const parsed = JSON.parse(raw) as Partial<StudentReportCommentNotificationState> | null
    if (!parsed || typeof parsed !== "object") return { lastReadAt: null, readIds: [] }

    const lastReadAt = typeof parsed.lastReadAt === "string" ? parsed.lastReadAt : null
    const readIds = Array.isArray(parsed.readIds)
      ? parsed.readIds
          .filter((id): id is string => typeof id === "string")
          .map(normalizeNotificationKey)
          .filter(Boolean)
      : []

    return { lastReadAt, readIds }
  } catch {
    return { lastReadAt: null, readIds: [] }
  }
}

export function saveStudentReportCommentNotificationState(state: StudentReportCommentNotificationState) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore write failures.
  }
}

function emitStudentReportCommentNotificationStateChange(state: StudentReportCommentNotificationState) {
  if (typeof window === "undefined") return

  try {
    window.dispatchEvent(new CustomEvent(STUDENT_REPORT_COMMENT_NOTIFICATIONS_EVENT, { detail: state }))
  } catch {
    // Ignore dispatch failures.
  }
}

export function isStudentReportCommentUnread(
  notificationKey: string,
  createdAt: string,
  state: StudentReportCommentNotificationState,
) {
  const normalizedKey = normalizeNotificationKey(notificationKey)
  if (!normalizedKey) return false

  const createdAtDate = safeParseDate(createdAt)
  if (!createdAtDate) return false

  const lastReadAt = safeParseDate(state.lastReadAt)
  if (lastReadAt && createdAtDate.getTime() <= lastReadAt.getTime()) return false

  return !state.readIds.includes(normalizedKey)
}

export function markStudentReportCommentAsRead(notificationKey: string, createdAt?: string | null) {
  const state = loadStudentReportCommentNotificationState()
  const normalizedKey = normalizeNotificationKey(notificationKey)

  if (!normalizedKey) return state

  const createdAtDate = safeParseDate(createdAt)
  const lastReadAt = safeParseDate(state.lastReadAt)
  if (createdAtDate && lastReadAt && createdAtDate.getTime() <= lastReadAt.getTime()) return state

  if (state.readIds.includes(normalizedKey)) return state

  const next = {
    ...state,
    readIds: [normalizedKey, ...state.readIds].slice(0, MAX_READ_IDS),
  }

  saveStudentReportCommentNotificationState(next)
  emitStudentReportCommentNotificationStateChange(next)
  return next
}

export function markAllStudentReportCommentsAsRead(latestCreatedAt?: string | null) {
  const state = loadStudentReportCommentNotificationState()
  const latest = safeParseDate(latestCreatedAt)

  const next = {
    ...state,
    lastReadAt: (latest || new Date()).toISOString(),
    readIds: [],
  }

  saveStudentReportCommentNotificationState(next)
  emitStudentReportCommentNotificationStateChange(next)
  return next
}
