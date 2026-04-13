"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { isSuperAdminEmail, normalizeEmail } from "@/lib/admin"
import { waitForNextPaint } from "@/lib/browser-processing"
import { REPORT_ATTACHMENTS_BUCKET, REPORT_MAX_FILES, REPORT_MAX_FILE_SIZE_BYTES, getAttachmentKind, sanitizeStorageFileName } from "@/lib/report-media"
import { createBrowserClient } from "@/lib/supabase/client"
import { ReportCommentsThread } from "@/components/report/report-comments-thread"
import { ReportMediaGrid } from "@/components/report/report-media-grid"
import { markAdminReportAsRead } from "@/lib/admin/report-notifications"
import { Search, Eye, Calendar, User, FileText, Printer, Loader2, Trash2, Upload, X, ImageIcon, FileVideo, Mic, Paperclip, CheckCircle2 } from "lucide-react"

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
  resolution_description: string | null
  resolution_attachments: string[] | null
  resolved_at: string | null
}

interface PrintLoadingState {
  progress: number
  description: string
}

export default function AdminReportsPage() {
  const router = useRouter()
  const pathname = usePathname()
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
  const [reportPendingDelete, setReportPendingDelete] = useState<Report | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [printLoadingState, setPrintLoadingState] = useState<PrintLoadingState | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [processingReportId, setProcessingReportId] = useState<string | null>(null)
  const [resolutionDescription, setResolutionDescription] = useState("")
  const [existingResolutionAttachments, setExistingResolutionAttachments] = useState<string[]>([])
  const [newResolutionFiles, setNewResolutionFiles] = useState<File[]>([])
  const [isSavingResolution, setIsSavingResolution] = useState(false)
  const [isResolutionConfirmOpen, setIsResolutionConfirmOpen] = useState(false)
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false)
  const [statusChangeTarget, setStatusChangeTarget] = useState<string | null>(null)
  const openedReportIdFromQuery = useRef<string | null>(null)
  const supabase = createBrowserClient()
  const canDeleteReports = isSuperAdminEmail(currentUserEmail)

  useEffect(() => {
    if (!selectedReport) {
      setResolutionDescription("")
      setExistingResolutionAttachments([])
      setNewResolutionFiles([])
      setIsResolutionConfirmOpen(false)
      return
    }

    setResolutionDescription(selectedReport.resolution_description || "")
    setExistingResolutionAttachments(selectedReport.resolution_attachments || [])
    setNewResolutionFiles([])
    setIsResolutionConfirmOpen(false)
  }, [selectedReport?.id])

  useEffect(() => {
    if (!selectedReport) return
    markAdminReportAsRead(selectedReport.id, selectedReport.created_at)
  }, [selectedReport])

  useEffect(() => {
    const loadCurrentUserEmail = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setCurrentUserEmail(user?.email ? normalizeEmail(user.email) : null)
    }

    void loadCurrentUserEmail()
  }, [supabase])

  useEffect(() => {
    const statusFromQuery = searchParams.get("status")
    const validStatuses = new Set(["pending", "in_progress", "resolved", "all"])
    if (statusFromQuery && validStatuses.has(statusFromQuery)) {
      setStatusFilter(statusFromQuery)
    }
  }, [searchParams])

  useEffect(() => {
    const reportIdFromQuery = searchParams.get("reportId")
    if (!reportIdFromQuery) {
      openedReportIdFromQuery.current = null
      return
    }
    if (openedReportIdFromQuery.current === reportIdFromQuery) return

    const openReport = async () => {
      const existingReport = reports.find((r) => r.id === reportIdFromQuery)
      if (existingReport) {
        setSelectedReport(existingReport)
        openedReportIdFromQuery.current = reportIdFromQuery
        return
      }

      const { data: fetchedReport } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportIdFromQuery)
        .maybeSingle()

      if (!fetchedReport) return

      let reporterName = fetchedReport.reporter_name?.trim() || "Unknown Student"

      if (fetchedReport.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, first_name, last_name, lrn")
          .eq("id", fetchedReport.user_id)
          .maybeSingle()

        const fullName =
          profile?.full_name?.trim() ||
          [profile?.first_name, profile?.last_name]
            .filter((name): name is string => Boolean(name))
            .join(" ")
            .trim()

        reporterName = fullName || reporterName
      }

      const enrichedReport = {
        ...fetchedReport,
        reporter_name: reporterName,
      } as Report

      setReports((prev) => (prev.some((r) => r.id === enrichedReport.id) ? prev : [enrichedReport, ...prev]))
      setSelectedReport(enrichedReport)
      openedReportIdFromQuery.current = reportIdFromQuery
    }

    void openReport()
  }, [reports, searchParams, supabase])

  const clearReportIdFromUrl = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (!params.has("reportId")) return

    params.delete("reportId")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const closeReportDialog = () => {
    setSelectedReport(null)
    setReportPendingDelete(null)
    openedReportIdFromQuery.current = null
    clearReportIdFromUrl()
  }

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false })

      if (data) {
        type ProfileLookupRecord = {
          id: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          lrn?: string | null
        }

        const userIds = [...new Set(data.map((report) => report.user_id).filter(Boolean))]
        const profileById = new Map<string, Omit<ProfileLookupRecord, "id">>()

        if (userIds.length > 0) {
          const { data: profilesWithFullName, error: profileFullNameError } = await supabase
            .from("profiles")
            .select("id, full_name, first_name, last_name, lrn")
            .in("id", userIds)

          let profiles: ProfileLookupRecord[] | null = (profilesWithFullName as ProfileLookupRecord[] | null) || null

          if (profileFullNameError) {
            const { data: fallbackProfiles } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, lrn")
              .in("id", userIds)
            profiles = (fallbackProfiles as ProfileLookupRecord[] | null) || null
          }

          profiles?.forEach((profile) => {
            profileById.set(profile.id, {
              full_name: profile.full_name,
              first_name: profile.first_name,
              last_name: profile.last_name,
              lrn: profile.lrn,
            })
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

          const reporterName = fullName || report.reporter_name?.trim() || "Unknown Student"

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
      filtered = filtered.filter((r) => (r.status || "pending") === statusFilter)
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

  const applyReportPatch = (reportId: string, patch: Partial<Report>) => {
    setReports((prev) => prev.map((report) => (report.id === reportId ? { ...report, ...patch } : report)))
    setSelectedReport((prev) => (prev?.id === reportId ? { ...prev, ...patch } : prev))
  }

  const updateStatus = async (reportId: string, newStatus: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", reportId)

    if (!error) {
      applyReportPatch(reportId, {
        status: newStatus,
        resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
      })
    } else {
      toast({
        variant: "destructive",
        title: "Status update failed",
        description: error.message || "Unable to update the report status right now.",
      })
    }
  }

  const handleResolutionFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length === 0) return

    const oversizedFiles = selectedFiles.filter((file) => file.size > REPORT_MAX_FILE_SIZE_BYTES)
    if (oversizedFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "Files are too large",
        description: "Each resolution file must be 25MB or smaller.",
      })
      event.target.value = ""
      return
    }

    setNewResolutionFiles((prev) => {
      const combinedFiles = [...prev, ...selectedFiles]
      const remainingSlots = REPORT_MAX_FILES - existingResolutionAttachments.length
      const nextFiles = combinedFiles.slice(0, Math.max(remainingSlots, 0))

      if (combinedFiles.length > remainingSlots) {
        toast({
          variant: "destructive",
          title: "Too many files",
          description: `You can keep up to ${REPORT_MAX_FILES} resolution files in total.`,
        })
      }

      return nextFiles
    })

    event.target.value = ""
  }

  const removeNewResolutionFile = (index: number) => {
    setNewResolutionFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
  }

  const removeExistingResolutionAttachment = (url: string) => {
    setExistingResolutionAttachments((prev) => prev.filter((attachment) => attachment !== url))
  }

  const confirmResolution = async (report: Report) => {
    const trimmedDescription = resolutionDescription.trim()
    if (!trimmedDescription) {
      toast({
        variant: "destructive",
        title: "Resolution description required",
        description: "Describe the action taken before marking the report as resolved.",
      })
      return
    }

    setIsSavingResolution(true)

    try {
      const uploadedUrls: string[] = []

      for (const file of newResolutionFiles) {
        const safeFileName = sanitizeStorageFileName(file.name)
        const filePath = `resolutions/${report.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeFileName}`

        const { error: uploadError } = await supabase.storage.from(REPORT_ATTACHMENTS_BUCKET).upload(filePath, file)

        if (uploadError) {
          throw new Error(uploadError.message || "Failed to upload one of the resolution files.")
        }

        const { data: urlData } = supabase.storage.from(REPORT_ATTACHMENTS_BUCKET).getPublicUrl(filePath)
        uploadedUrls.push(urlData.publicUrl)
      }

      const nextResolvedAt = new Date().toISOString()
      const nextResolutionAttachments = [...existingResolutionAttachments, ...uploadedUrls]
      const reportPatch = {
        resolution_description: trimmedDescription,
        resolution_attachments: nextResolutionAttachments.length > 0 ? nextResolutionAttachments : null,
        resolved_at: nextResolvedAt,
        status: "resolved",
        updated_at: nextResolvedAt,
      }

      const { error } = await supabase.from("reports").update(reportPatch).eq("id", report.id)

      if (error) {
        throw new Error(error.message || "Failed to save the resolution details.")
      }

      applyReportPatch(report.id, reportPatch)
      setExistingResolutionAttachments(nextResolutionAttachments)
      setNewResolutionFiles([])
      setIsResolutionConfirmOpen(false)

      toast({
        title: "Report resolved",
        description: "The resolution details were saved and the report is now marked as resolved.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resolve the report."
      toast({
        variant: "destructive",
        title: "Resolution failed",
        description: message,
      })
    } finally {
      setIsSavingResolution(false)
    }
  }

  const deleteReport = async (report: Report) => {
    if (!canDeleteReports) {
      toast({
        variant: "destructive",
        title: "Delete not allowed",
        description: "Only the Super Admin can delete reports.",
      })
      setReportPendingDelete(null)
      return
    }

    setProcessingReportId(report.id)

    const { data, error } = await supabase.from("reports").delete().eq("id", report.id).select("id").maybeSingle()

    if (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          error.code === "42501"
            ? "Only the Super Admin can delete reports."
            : error.message || "Failed to delete the selected report.",
      })
      setProcessingReportId(null)
      return
    }

    if (!data) {
      toast({
        variant: "destructive",
        title: "Report not found",
        description: "This report may have already been deleted or is no longer available.",
      })
      setReportPendingDelete(null)
      setProcessingReportId(null)
      if (selectedReport?.id === report.id || openedReportIdFromQuery.current === report.id) {
        closeReportDialog()
      }
      return
    }

    setReports((prev) => prev.filter((item) => item.id !== report.id))
    setFilteredReports((prev) => prev.filter((item) => item.id !== report.id))
    setReportPendingDelete(null)
    setProcessingReportId(null)

    if (selectedReport?.id === report.id || openedReportIdFromQuery.current === report.id) {
      closeReportDialog()
    }

    toast({
      title: "Report deleted",
      description: "The report and its related comments were removed.",
    })
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

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")

  const summarizeAttachments = (attachments: string[]) => {
    const counts = attachments.reduce(
      (summary, url) => {
        const kind = getAttachmentKind(url)
        summary[kind] += 1
        return summary
      },
      { image: 0, video: 0, audio: 0, other: 0 },
    )

    const parts: string[] = []
    if (counts.image > 0) parts.push(`${counts.image} image${counts.image === 1 ? "" : "s"}`)
    if (counts.video > 0) parts.push(`${counts.video} video${counts.video === 1 ? "" : "s"}`)
    if (counts.audio > 0) parts.push(`${counts.audio} recording${counts.audio === 1 ? "" : "s"}`)
    if (counts.other > 0) parts.push(`${counts.other} other file${counts.other === 1 ? "" : "s"}`)

    return parts.length > 0 ? parts.join(", ") : `${attachments.length} file${attachments.length === 1 ? "" : "s"}`
  }

  const buildPrintAttachmentsHtml = (attachments: string[], sectionLabel: string) => {
    if (attachments.length === 0) {
      return `<p class="muted">No ${sectionLabel.toLowerCase()}.</p>`
    }

    return `<div>${attachments
      .map((url, index) => {
        const kind = getAttachmentKind(url)

        if (kind === "image") {
          return `
            <div style="margin-bottom: 12px;">
              <div style="font-size: 12px; color: #555; margin-bottom: 4px;">${sectionLabel} ${index + 1}</div>
              <img src="${url}" alt="${sectionLabel} ${index + 1}" style="max-width: 100%; max-height: 320px; border: 1px solid #ddd; border-radius: 6px;" />
            </div>
          `
        }

        const kindLabel =
          kind === "video" ? "Video recording is also provided" : kind === "audio" ? "Audio recording is also provided" : "Attachment"

        return `
          <div style="margin-bottom: 8px;">
            <span style="font-size: 12px; color: #555;">${sectionLabel} ${index + 1}: ${kindLabel}</span>
          </div>
        `
      })
      .join("")}</div>`
  }

  const buildReportInsights = (report: Report) => {
    const insights: string[] = []
    const createdAt = new Date(report.created_at)
    const statusLabel = report.status || "pending"

    insights.push(`Submitted on ${createdAt.toLocaleString()} and currently marked as ${statusLabel}.`)

    if (report.bullying_type) {
      insights.push(`Categorized as ${report.bullying_type}.`)
    }

    if (report.incident_date) {
      const incidentDate = new Date(report.incident_date)
      if (!Number.isNaN(incidentDate.getTime())) {
        const msPerDay = 1000 * 60 * 60 * 24
        const reportDay = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate())
        const incidentDay = new Date(incidentDate.getFullYear(), incidentDate.getMonth(), incidentDate.getDate())
        const diffDays = Math.round((reportDay.getTime() - incidentDay.getTime()) / msPerDay)
        if (diffDays === 0) {
          insights.push("Incident date matches the submission day.")
        } else if (diffDays > 0) {
          insights.push(`Reported ${diffDays} day${diffDays === 1 ? "" : "s"} after the incident date.`)
        } else {
          insights.push(
            `Incident date is ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} after submission in the record.`,
          )
        }
      }
    } else {
      insights.push("Incident date was not provided.")
    }

    const detailText = report.details?.trim() || ""
    if (!detailText) {
      insights.push("No incident details were provided.")
    }

    const attachments = report.attachments || []
    if (attachments.length > 0) {
      insights.push(`Attachments included: ${summarizeAttachments(attachments)}.`)
    } else {
      insights.push("No attachments were included.")
    }

    const resolutionDescriptionText = report.resolution_description?.trim() || ""
    const resolutionAttachments = report.resolution_attachments || []
    if (resolutionDescriptionText || resolutionAttachments.length > 0) {
      insights.push("A resolution update has been added to this report.")
      if (resolutionDescriptionText) {
        insights.push(`Resolution summary recorded: ${resolutionDescriptionText.slice(0, 120)}${resolutionDescriptionText.length > 120 ? "..." : ""}`)
      }
      if (resolutionAttachments.length > 0) {
        insights.push(`Resolution evidence included: ${summarizeAttachments(resolutionAttachments)}.`)
      }
      if (report.resolved_at) {
        insights.push(`Marked resolved on ${new Date(report.resolved_at).toLocaleString()}.`)
      }
    } else if (report.status === "resolved") {
      insights.push("This report is marked as resolved, but no resolution details have been recorded yet.")
    }

    return insights
  }

  const handlePrintReport = async (report: Report) => {
    // Open the print window before yielding so popup blockers still treat this as a user action.
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    setIsPrinting(true)
    setPrintLoadingState({
      progress: 25,
      description: "Compiling report details.",
    })

    try {
      // Yield between stages so React can paint the loading screen before each chunk of work.
      await waitForNextPaint()

      const attachmentsHtml = buildPrintAttachmentsHtml(report.attachments || [], "Attachment")
      const hasResolution = report.resolution_description?.trim() || (report.resolution_attachments && report.resolution_attachments.length > 0) || report.resolved_at
      const resolutionHtml = hasResolution ? `
        <h2>Resolution Details</h2>
        <div class="box">${
          report.resolution_description?.trim()
            ? escapeHtml(report.resolution_description).replace(/\n/g, "<br/>")
            : '<span class="muted">No resolution description provided.</span>'
        }</div>
        <div style="margin-top: 10px;" class="field">
          <span class="label">Resolved At:</span>${report.resolved_at ? new Date(report.resolved_at).toLocaleString() : "Not yet resolved"}
        </div>
        <div style="margin-top: 12px;">
          ${buildPrintAttachmentsHtml(report.resolution_attachments || [], "Resolution Attachment")}
        </div>
      ` : ""

      setPrintLoadingState({
        progress: 75,
        description: "Building printable layout.",
      })
      await waitForNextPaint()

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

            ${resolutionHtml}
          </body>
        </html>
      `

      setPrintLoadingState({
        progress: 100,
        description: "Print preview ready.",
      })
      await waitForNextPaint()

      printWindow.document.open()
      printWindow.document.write(printHtml)
      printWindow.document.close()
      printWindow.focus()

      printWindow.print()
    } finally {
      setIsPrinting(false)
      setPrintLoadingState(null)
    }
  }

  const bullyingTypes = [...new Set(reports.map((r) => r.bullying_type).filter(Boolean))]
  const reportInsights = selectedReport ? buildReportInsights(selectedReport) : []
  const selectedReportIsProcessing = selectedReport ? processingReportId === selectedReport.id : false
  const selectedReportIsBusy = selectedReportIsProcessing || isSavingResolution
  const totalResolutionFiles = existingResolutionAttachments.length + newResolutionFiles.length

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved",
  }

  const confirmStatusChange = async () => {
    if (!selectedReport || !statusChangeTarget) return

    setIsStatusConfirmOpen(false)
    await updateStatus(selectedReport.id, statusChangeTarget)
    setStatusChangeTarget(null)
  }

  const cancelStatusChange = () => {
    setStatusChangeTarget(null)
    setIsStatusConfirmOpen(false)
  }

  return (
    <AdminLayout>
      {printLoadingState && (
        <LoadingScreen
          mode="overlay"
          title="Preparing report details"
          description={printLoadingState.description}
          progress={printLoadingState.progress}
        />
      )}
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#007cce]">Report Details</h1>
          <p className="text-black">View and manage all submitted bullying reports</p>
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
                      <p className="text-sm text-white whitespace-pre-line mb-2">
                        {report.details ? report.details.slice(0, 140) : "No details provided."}
                      </p>
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
        <Dialog
          open={!!selectedReport}
          onOpenChange={(open) => {
            if (open) return
            closeReportDialog()
          }}
        >
          <DialogContent className="h-[min(90vh,48rem)] w-[min(96vw,90rem)] max-w-[min(96vw,90rem)] sm:max-w-[min(96vw,90rem)] overflow-hidden bg-slate-800 border-slate-700 p-0 gap-0 flex flex-col [&>button]:text-white [&>button]:opacity-100 [&>button:hover]:text-white">
            <DialogHeader className="shrink-0 border-b border-slate-700 px-6 py-5 pr-14">
              <DialogTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Report Details
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Submitted on {selectedReport && new Date(selectedReport.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-4">
                  <div className="flex justify-end gap-2">
                    {canDeleteReports && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setReportPendingDelete(selectedReport)}
                        disabled={selectedReportIsProcessing || isPrinting}
                      >
                        {selectedReportIsProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Delete Report
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePrintReport(selectedReport)}
                      disabled={isPrinting || selectedReportIsProcessing}
                      className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      {isPrinting ? "Preparing..." : "Print / Save PDF"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        disabled={selectedReportIsBusy}
                        onValueChange={(value) => {
                          if (value === selectedReport.status) return
                          setStatusChangeTarget(value)
                          setIsStatusConfirmOpen(true)
                        }}
                      >
                        <SelectTrigger className="w-full max-w-xs bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="pending" className="text-white">Pending</SelectItem>
                          <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
                          <SelectItem value="resolved" className="text-white" disabled={selectedReport.status !== "resolved"}>
                            Resolved
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="mt-2 text-xs text-slate-400">
                        Use the resolution section below to confirm the action taken before marking this report as resolved.
                      </p>
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
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Resolved At</p>
                      <p className="text-sm text-white">
                        {selectedReport.resolved_at ? new Date(selectedReport.resolved_at).toLocaleString() : "Not resolved yet"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-1">Details</p>
                    <div className="p-3 bg-slate-700/30 rounded-lg">
                      <p className="text-sm text-white whitespace-pre-wrap">{selectedReport.details}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-1">Descriptive Analysis</p>
                    <div className="p-3 bg-slate-700/30 rounded-lg">
                      {reportInsights.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-slate-100 space-y-1">
                          {reportInsights.map((item, index) => (
                            <li key={`${index}-${item}`}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400">No analysis available.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-2">Attachments</p>
                    <ReportMediaGrid
                      attachments={selectedReport.attachments || []}
                      emptyMessage="No incident attachments were added."
                      variant="dark"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm space-y-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Resolution Details</p>
                        <p className="text-xs text-slate-700">
                          Record what was done to address the report. Confirming this section will automatically mark the report as resolved.
                        </p>
                      </div>
                      {selectedReport.status === "resolved" ? (
                        <Badge variant="outline" className="border-slate-300 text-slate-900">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Resolved
                        </Badge>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-xs text-slate-700 mb-2">Resolution Description</p>
                      <Textarea
                        value={resolutionDescription}
                        onChange={(event) => setResolutionDescription(event.target.value)}
                        placeholder="Describe the intervention, follow-up, and outcome for this report..."
                        rows={5}
                        disabled={selectedReportIsBusy}
                        className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 ring-1 ring-slate-200"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-300">Resolution Media</p>
                          <p className="text-xs text-slate-400">
                            Add images, recordings, or videos. Up to {REPORT_MAX_FILES} files, 25MB each.
                          </p>
                        </div>
                        <Input
                          id="resolution-attachments"
                          type="file"
                          accept="image/*,audio/*,video/*"
                          multiple
                          onChange={handleResolutionFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("resolution-attachments")?.click()}
                          disabled={selectedReportIsBusy || totalResolutionFiles >= REPORT_MAX_FILES}
                          className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Add Media
                        </Button>
                      </div>

                      {newResolutionFiles.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {newResolutionFiles.map((file, index) => {
                            const fileKind = getAttachmentKind(file.name, file.type)
                            const FileIcon =
                              fileKind === "image" ? ImageIcon : fileKind === "video" ? FileVideo : fileKind === "audio" ? Mic : Paperclip

                            return (
                              <div
                                key={`${file.name}-${file.lastModified}-${index}`}
                                className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/40 px-3 py-2"
                              >
                                <FileIcon className="h-4 w-4 text-slate-300" />
                                <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeNewResolutionFile(index)}
                                  className="rounded p-1 text-slate-300 transition-colors hover:bg-slate-600 hover:text-white"
                                  aria-label={`Remove ${file.name}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}

                      <div>
                        <p className="mb-2 text-xs text-slate-300">Saved Resolution Media</p>
                        <ReportMediaGrid
                          attachments={existingResolutionAttachments}
                          emptyMessage="No saved resolution media yet."
                          itemLabelPrefix="Resolution"
                          onRemove={selectedReportIsBusy ? undefined : removeExistingResolutionAttachment}
                          variant="dark"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-400">
                        {selectedReport.status === "resolved"
                          ? "Update the saved resolution details here if more follow-up is needed."
                          : "This report will move to Resolved once you confirm these details."}
                      </p>
                      <Button
                        type="button"
                        onClick={() => {
                          if (!resolutionDescription.trim()) {
                            toast({
                              variant: "destructive",
                              title: "Resolution description required",
                              description: "Add a summary of the action taken before confirming the resolution.",
                            })
                            return
                          }
                          setIsResolutionConfirmOpen(true)
                        }}
                        disabled={selectedReportIsBusy || !resolutionDescription.trim()}
                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        {isSavingResolution ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : selectedReport.status === "resolved" ? (
                          "Update Resolution Details"
                        ) : (
                          "Confirm Resolution"
                        )}
                      </Button>
                    </div>
                  </div>

                  <ReportCommentsThread reportId={selectedReport.id} authorRole="admin" variant="dark" className="pt-1" />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!reportPendingDelete}
          onOpenChange={(open) => {
            if (open) return
            setReportPendingDelete(null)
          }}
        >
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this report?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                {reportPendingDelete
                  ? `This will permanently delete the report from ${reportPendingDelete.reporter_name || "Unknown Student"} and remove its comment thread. This action cannot be undone.`
                  : "This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={processingReportId === reportPendingDelete?.id}
                className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!reportPendingDelete || processingReportId === reportPendingDelete?.id}
                onClick={() => {
                  if (!reportPendingDelete) return
                  void deleteReport(reportPendingDelete)
                }}
                className="bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500/40"
              >
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isStatusConfirmOpen} onOpenChange={(open) => (open ? setIsStatusConfirmOpen(true) : cancelStatusChange())}>
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm status change?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                {selectedReport && statusChangeTarget
                  ? `Change report status from ${statusLabels[selectedReport.status] || selectedReport.status} to ${statusLabels[statusChangeTarget] || statusChangeTarget}?`
                  : "Confirm the requested report status update."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={cancelStatusChange}
                className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!selectedReport || !statusChangeTarget}
                onClick={() => {
                  void confirmStatusChange()
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500/40"
              >
                Confirm Status Change
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isResolutionConfirmOpen} onOpenChange={setIsResolutionConfirmOpen}>
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm resolution?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                Saving this resolution will store the description and media, then automatically update the report status to resolved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isSavingResolution}
                className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!selectedReport || isSavingResolution}
                onClick={() => {
                  if (!selectedReport) return
                  void confirmResolution(selectedReport)
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500/40"
              >
                {isSavingResolution ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Confirm and Resolve"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}
