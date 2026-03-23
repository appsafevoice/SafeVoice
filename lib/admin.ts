export const DEFAULT_ADMIN_NAME = "Administrator"
export const ADMIN_NAME = DEFAULT_ADMIN_NAME
export const SUPER_ADMIN_EMAIL = "jethropayoc@gmail.com"
export const ADMIN_EMAIL = SUPER_ADMIN_EMAIL
export const RESERVED_ADMIN_EMAILS = [SUPER_ADMIN_EMAIL, "jthrpayoc@gmail.com", "admin3@example.com"]

export function normalizeEmail(email?: string | null) {
  return (email || "").trim().toLowerCase()
}

export function isSuperAdminEmail(email?: string | null) {
  return normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL)
}

export function isLegacyAdminEmail(email?: string | null) {
  return normalizeEmail(email) === normalizeEmail(ADMIN_EMAIL)
}

export function isReservedAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email)
  return RESERVED_ADMIN_EMAILS.some((adminEmail) => normalizeEmail(adminEmail) === normalized)
}

export function getAdminRoleLabel(email?: string | null) {
  return isSuperAdminEmail(email) ? "Super Admin" : DEFAULT_ADMIN_NAME
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("")
}
