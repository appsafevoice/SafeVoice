export function formatReportStatusLabel(status?: string | null) {
  return (status || "pending").trim().replace(/_/g, " ")
}
