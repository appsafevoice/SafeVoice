export const DEFAULT_ADMIN_NAME = "Administrator"
export const ADMIN_NAME = DEFAULT_ADMIN_NAME
export const SUPER_ADMIN_EMAIL = "appsafevoice@gmail.com"

export function normalizeEmail(email?: string | null) {
  return (email || "").trim().toLowerCase()
}

export function isSuperAdminEmail(email?: string | null) {
  return normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL)
}

export function getAdminRoleLabel(email?: string | null) {
  return isSuperAdminEmail(email) ? "Admin" : DEFAULT_ADMIN_NAME
}

export function getAdminPositionLabel(position?: string | null, email?: string | null) {
  if (isSuperAdminEmail(email)) {
    return "Admin"
  }

  return position?.trim() || getAdminRoleLabel(email)
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("")
}
