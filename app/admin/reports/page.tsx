"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import { ReportCommentsThread } from "@/components/report/report-comments-thread"
import { Search, Eye, Calendar, User, FileText, Printer } from "lucide-react"



interface Report {
  id: string
  user_id?: string | null
  bullying_type: string
  status: string
  created_at: string
  incident_date: string
  details: string
  reporter_name: string | null
  attachments: string[] | null
}

export default function AdminReportsPage() {
  const searchParams = useSearchParams()
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    const statusFromQuery = searchParams.get("status")
    const validStatuses = new Set(["pending", "in_progress", "resolved", "all"])
    if (statusFromQuery && validStatuses.has(statusFromQuery)) {
      setStatusFilter(statusFromQuery)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false })

      if (data) {
        const userIds = [...new Set(data.map((report) => report.user_id).filter(Boolean))]
        const profileById = new Map<
          string,
          { full_name?: string | null; first_name?: string | null; last_name?: string | null; lrn?: string | null }
        >()

        if (userIds.length > 0) {
          const { data: profilesWithFullName, error: profileFullNameError } = await supabase
            .from("profiles")
            .select("id, full_name, first_name, last_name, lrn")
            .in("id", userIds)

          let profiles = profilesWithFullName

          if (profileFullNameError) {
            const { data: fallbackProfiles } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, lrn")
              .in("id", userIds)
            profiles = fallbackProfiles
          }

          profiles?.forEach((profile) => {
            profileById.set(profile.id, profile)
          })
        }

        const enrichedReports = data.map((report) => {
          const profile = report.user_id ? profileById.get(report.user_id) : undefined
          const fullName =
            profile?.full_name?.trim() ||
            [profile?.first_name, profile?.last_name]
              .filter((name): name is string => Boolean(name))
              .join(" ")
              .trim()
          const lrn = profile?.lrn?.trim()

          const reporterName =
            fullName && lrn
              ? `${fullName} (${lrn})`
              : fullName || (lrn ? `LRN: ${lrn}` : report.reporter_name?.trim() || "Unknown Student")

          return {
            ...report,
            reporter_name: reporterName,
          }
        })

        setReports(enrichedReports)
        setFilteredReports(enrichedReports)
      }
      setIsLoading(false)
    }

    fetchReports()
  }, [supabase])

  useEffect(() => {
    let filtered = reports

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.reporter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.bullying_type?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.bullying_type === typeFilter)
    }

    if (startDateFilter || endDateFilter) {
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.created_at)
        const reportDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate()).getTime()
        const startDay = startDateFilter
          ? new Date(`${startDateFilter}T00:00:00`).getTime()
          : Number.NEGATIVE_INFINITY
        const endDay = endDateFilter
          ? new Date(`${endDateFilter}T23:59:59`).getTime()
          : Number.POSITIVE_INFINITY
        return reportDay >= startDay && reportDay <= endDay
      })
    }

    setFilteredReports(filtered)
  }, [searchTerm, statusFilter, typeFilter, startDateFilter, endDateFilter, reports])

  const updateStatus = async (reportId: string, newStatus: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", reportId)

    if (!error) {
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)))
      if (selectedReport?.id === reportId) {
        setSelectedReport({ ...selectedReport, status: newStatus })
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-500/20 text-green-400 border-green-500/50"
      case "in_progress":
        return "bg-amber-500/20 text-amber-400 border-amber-500/50"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/50"
    }
  }

  const isImageAttachment = (url: string) => {
    const cleanUrl = url.split("?")[0].toLowerCase()
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(cleanUrl)
  }

  const isVideoAttachment = (url: string) => {
    const cleanUrl = url.split("?")[0].toLowerCase()
    return /\.(mp4|webm|ogg|mov|m4v)$/.test(cleanUrl)
  }

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")

  const handlePrintReport = async (report: Report) => {
    setIsPrinting(true)

    const attachmentsHtml =
      report.attachments && report.attachments.length > 0
        ? `<div>${report.attachments
            .map((url, i) =>
              isImageAttachment(url)
                ? `
                  <div style="margin-bottom: 12px;">
                    <div style="font-size: 12px; color: #555; margin-bottom: 4px;">Attachment ${i + 1}</div>
                    <img src="${url}" alt="Attachment ${i + 1}" style="max-width: 100%; max-height: 320px; border: 1px solid #ddd; border-radius: 6px;" />
                  </div>
                `
                : `
                  <div style="margin-bottom: 8px;">
                    <span style="font-size: 12px; color: #555;">Attachment ${i + 1}: Non-image attachment</span>
                  </div>
                `,
            )
            .join("")}</div>`
        : `<p class="muted">No attachments.</p>`

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Report ${report.id}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; margin: 24px; line-height: 1.45; }
            h1 { margin: 0 0 8px 0; font-size: 22px; }
            h2 { margin: 24px 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
            .field { margin: 4px 0; }
            .label { font-weight: bold; display: inline-block; min-width: 130px; }
            .box { border: 1px solid #ddd; padding: 10px; border-radius: 6px; background: #fafafa; }
            .muted { color: #666; }
            .comment { border: 1px solid #ddd; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
            .comment-meta { display: flex; justify-content: space-between; font-size: 12px; color: #444; margin-bottom: 4px; }
            .comment-content { font-size: 13px; }
            @media print { body { margin: 12mm; } a { color: #111; text-decoration: none; } }
          </style>
        </head>
        <body>
          <h1>SafeVoice Report Details</h1>
          <div class="field"><span class="label">Report ID:</span>${report.id}</div>
          <div class="meta">
            <div class="field"><span class="label">Submitted:</span>${new Date(report.created_at).toLocaleString()}</div>
            <div class="field"><span class="label">Incident Date:</span>${report.incident_date ? new Date(report.incident_date).toLocaleDateString() : "Not specified"}</div>
            <div class="field"><span class="label">Reporter:</span>${escapeHtml(report.reporter_name || "Unknown Student")}</div>
            <div class="field"><span class="label">Type:</span>${escapeHtml(report.bullying_type || "Unknown")}</div>
            <div class="field"><span class="label">Status:</span>${escapeHtml(report.status || "pending")}</div>
          </div>

          <h2>Incident Details</h2>
          <div class="box">${escapeHtml(report.details || "").replace(/\n/g, "<br/>") || '<span class="muted">No details provided.</span>'}</div>

          <h2>Attachments</h2>
          ${attachmentsHtml}
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      setIsPrinting(false)
      return
    }

    printWindow.document.open()
    printWindow.document.write(printHtml)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()

    setIsPrinting(false)
  }

  const bullyingTypes = [...new Set(reports.map((r) => r.bullying_type).filter(Boolean))]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Report Details</h1>
          <p className="text-slate-400">View and manage all submitted bullying reports</p>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                  <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
                  <SelectItem value="resolved" className="text-white">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">All Types</SelectItem>
                  {bullyingTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-white">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full sm:w-44 bg-slate-700/50 border-slate-600 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
              />
              <Input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full sm:w-44 bg-slate-700/50 border-slate-600 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : filteredReports.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-8 text-center text-slate-400">No reports found</CardContent>
            </Card>
          ) : (
            filteredReports.map((report) => (
              <Card
                key={report.id}
                className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                          {report.bullying_type || "Unknown"}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(report.status)}>
                          {report.status || "pending"}
                        </Badge>
                      </div>
                      <p className="text-sm text-white line-clamp-2 mb-2">{report.details}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {report.reporter_name || "Unknown Student"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 text-black"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Report Detail Modal */}
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl [&>button]:text-white [&>button]:opacity-100 [&>button:hover]:text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Report Details
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Submitted on {selectedReport && new Date(selectedReport.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePrintReport(selectedReport)}
                    disabled={isPrinting}
                    className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    {isPrinting ? "Preparing..." : "Print / Save PDF"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Type</p>
                    <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                      {selectedReport.bullying_type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Status</p>
                    <Select
                      value={selectedReport.status || "pending"}
                      onValueChange={(value) => updateStatus(selectedReport.id, value)}
                    >
                      <SelectTrigger className="w-full bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="pending" className="text-white">Pending</SelectItem>
                        <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
                        <SelectItem value="resolved" className="text-white">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Reporter</p>
                    <p className="text-sm text-white">{selectedReport.reporter_name || "Unknown Student"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Incident Date</p>
                    <p className="text-sm text-white">
                      {selectedReport.incident_date
                        ? new Date(selectedReport.incident_date).toLocaleDateString()
                        : "Not specified"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">Details</p>
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-sm text-white whitespace-pre-wrap">{selectedReport.details}</p>
                  </div>
                </div>

                {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Attachments</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedReport.attachments.map((url, i) => (
                        <div key={i} className="rounded-lg border border-slate-600 bg-slate-700/30 overflow-hidden">
                          {isImageAttachment(url) ? (
                            <img
                              src={url}
                              alt={`Attachment ${i + 1}`}
                              className="w-full h-44 object-cover bg-slate-900"
                            />
                          ) : isVideoAttachment(url) ? (
                            <video src={url} controls className="w-full h-44 bg-slate-900" preload="metadata" />
                          ) : (
                            <div className="h-44 flex items-center justify-center text-sm text-slate-300 bg-slate-900 px-4 text-center">
                              Preview unavailable for this file type
                            </div>
                          )}
                          <div className="p-2 flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-300">Attachment {i + 1}</span>
                            <div className="flex items-center gap-2">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded bg-slate-700 text-xs text-cyan-300 hover:bg-slate-600"
                              >
                                Open
                              </a>
                              <a
                                href={url}
                                download
                                className="px-2.5 py-1 rounded bg-slate-700 text-xs text-cyan-300 hover:bg-slate-600"
                              >
                                Download
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <ReportCommentsThread reportId={selectedReport.id} authorRole="admin" variant="dark" className="pt-1" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
