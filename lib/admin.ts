export const ADMIN_NAME = "Jethro Pay-oc"
export const ADMIN_EMAIL = "jethropayoc@gmail.com"
export const RESERVED_ADMIN_EMAILS = ["jethropayoc@gmail.com", "jthrpayoc@gmail.com", "admin3@example.com"]

export function normalizeEmail(email?: string | null) {
  return (email || "").trim().toLowerCase()
}

export function isLegacyAdminEmail(email?: string | null) {
  return normalizeEmail(email) === normalizeEmail(ADMIN_EMAIL)
}

export function isReservedAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email)
  return RESERVED_ADMIN_EMAILS.some((adminEmail) => normalizeEmail(adminEmail) === normalized)
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("")
}
