export type AdminReportsNotificationState = {
  lastReadAt: string | null
  readIds: string[]
}

export const ADMIN_REPORTS_NOTIFICATIONS_EVENT = "sv:admin-reports-notifications-state-changed"

const STORAGE_KEY = "sv_admin_reports_notifications_v1"
const MAX_READ_IDS = 200

function normalizeNotificationKey(key: string) {
  const trimmed = key.trim()
  if (!trimmed) return ""
  return trimmed.includes(":") ? trimmed : `report:${trimmed}`
}

function safeParseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function loadAdminReportsNotificationState(): AdminReportsNotificationState {
  if (typeof window === "undefined") return { lastReadAt: null, readIds: [] }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { lastReadAt: null, readIds: [] }

    const parsed = JSON.parse(raw) as Partial<AdminReportsNotificationState> | null
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

export function saveAdminReportsNotificationState(state: AdminReportsNotificationState) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore write failures (private mode, quota, etc.)
  }
}

function emitAdminReportsNotificationStateChange(state: AdminReportsNotificationState) {
  if (typeof window === "undefined") return

  try {
    window.dispatchEvent(new CustomEvent(ADMIN_REPORTS_NOTIFICATIONS_EVENT, { detail: state }))
  } catch {
    // Ignore
  }
}

export function isAdminReportUnread(
  reportId: string,
  reportCreatedAt: string,
  state: AdminReportsNotificationState,
) {
  return isAdminNotificationUnread(`report:${reportId}`, reportCreatedAt, state)
}

export function markAdminReportAsRead(reportId: string, reportCreatedAt?: string | null) {
  return markAdminNotificationAsRead(`report:${reportId}`, reportCreatedAt)
}

export function isAdminNotificationUnread(
  notificationKey: string,
  createdAt: string,
  state: AdminReportsNotificationState,
) {
  const normalizedKey = normalizeNotificationKey(notificationKey)
  if (!normalizedKey) return false

  const createdAtDate = safeParseDate(createdAt)
  if (!createdAtDate) return false

  const lastReadAt = safeParseDate(state.lastReadAt)
  if (lastReadAt && createdAtDate.getTime() <= lastReadAt.getTime()) return false

  return !state.readIds.includes(normalizedKey)
}

export function markAdminNotificationAsRead(notificationKey: string, createdAt?: string | null) {
  const state = loadAdminReportsNotificationState()
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

  saveAdminReportsNotificationState(next)
  emitAdminReportsNotificationStateChange(next)
  return next
}

export function markAllAdminReportsAsRead(latestCreatedAt?: string | null) {
  return markAllAdminNotificationsAsRead(latestCreatedAt)
}

export function markAllAdminNotificationsAsRead(latestCreatedAt?: string | null) {
  const state = loadAdminReportsNotificationState()
  const latest = safeParseDate(latestCreatedAt)

  const next = {
    ...state,
    lastReadAt: (latest || new Date()).toISOString(),
    readIds: [],
  }

  saveAdminReportsNotificationState(next)
  emitAdminReportsNotificationStateChange(next)
  return next
}
