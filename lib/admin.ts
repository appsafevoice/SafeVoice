export const DEFAULT_ADMIN_NAME = "Administrator"
export const ADMIN_NAME = DEFAULT_ADMIN_NAME
export const SUPER_ADMIN_EMAIL = "appsafevoice@gmail.com"
export const ADMIN_ACCOUNT_POSITION_OPTIONS = ["Intern", "Guidance Counselor", "Admin"] as const

export type AdminAccountPosition = (typeof ADMIN_ACCOUNT_POSITION_OPTIONS)[number]

const SELECTABLE_ADMIN_POSITION_LABELS: Record<string, AdminAccountPosition> = {
  intern: "Intern",
  "guidance counselor": "Guidance Counselor",
  admin: "Admin",
}

const DISPLAY_ADMIN_POSITION_LABELS: Record<string, AdminAccountPosition> = {
  ...SELECTABLE_ADMIN_POSITION_LABELS,
  "super admin": "Admin",
}

export function normalizeEmail(email?: string | null) {
  return (email || "").trim().toLowerCase()
}

function normalizeAdminPositionKey(position?: string | null) {
  return (position || "").trim().toLowerCase().replace(/\s+/g, " ")
}

export function isSuperAdminEmail(email?: string | null) {
  return normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL)
}

export function normalizeSelectableAdminAccountPosition(position?: string | null) {
  const normalizedKey = normalizeAdminPositionKey(position)
  return SELECTABLE_ADMIN_POSITION_LABELS[normalizedKey] || null
}

export function normalizeAdminAccountPosition(position?: string | null) {
  const normalizedKey = normalizeAdminPositionKey(position)
  return DISPLAY_ADMIN_POSITION_LABELS[normalizedKey] || null
}

export function canAdminPostReportComments(position?: string | null, email?: string | null) {
  if (isSuperAdminEmail(email)) {
    return true
  }

  const normalizedPosition = normalizeAdminAccountPosition(position)
  return normalizedPosition === "Intern" || normalizedPosition === "Guidance Counselor"
}

export function canAdminManageReportResolutions(position?: string | null, email?: string | null) {
  return canAdminPostReportComments(position, email)
}

export function getAdminRoleLabel(email?: string | null) {
  return isSuperAdminEmail(email) ? "Admin" : DEFAULT_ADMIN_NAME
}

export function getAdminPositionLabel(position?: string | null, email?: string | null) {
  if (isSuperAdminEmail(email)) {
    return "Admin"
  }

  return normalizeAdminAccountPosition(position) || position?.trim() || getAdminRoleLabel(email)
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("")
}
