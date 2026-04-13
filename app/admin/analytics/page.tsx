"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { waitForNextPaint } from "@/lib/browser-processing"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  ADMIN_CHART_AXIS,
  ADMIN_CHART_BORDER,
  ADMIN_CHART_COLORS,
  ADMIN_CHART_GRID,
  ADMIN_CHART_SURFACE,
  ADMIN_CHART_TEXT,
} from "@/lib/admin-theme"
import { Printer } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts"

interface Report {
  id: string
  bullying_type: string
  status: string
  created_at: string
  incident_date: string
}

type ExportSectionKey =
  | "summary"
  | "monthlyTrend"
  | "typeDistribution"
  | "dailyActivity"
  | "descriptiveAnalysis"

type ExportSectionsState = Record<ExportSectionKey, boolean>

interface ExportLoadingState {
  progress: number
  description: string
}

export default function AdminAnalyticsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [monthlyStart, setMonthlyStart] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 5)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  })
  const [monthlyEnd, setMonthlyEnd] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  })
  const [dailyStart, setDailyStart] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 13)
    return date.toISOString().split("T")[0]
  })
  const [dailyEnd, setDailyEnd] = useState(() => {
    const date = new Date()
    return date.toISOString().split("T")[0]
  })
  const [typeDistStart, setTypeDistStart] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 29)
    return date.toISOString().split("T")[0]
  })
  const [typeDistEnd, setTypeDistEnd] = useState(() => {
    const date = new Date()
    return date.toISOString().split("T")[0]
  })
  const [exportStart, setExportStart] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 13)
    return date.toISOString().split("T")[0]
  })
  const [exportEnd, setExportEnd] = useState(() => {
    const date = new Date()
    return date.toISOString().split("T")[0]
  })
  const [exportSections, setExportSections] = useState<ExportSectionsState>(() => ({
    summary: true,
    monthlyTrend: true,
    typeDistribution: true,
    dailyActivity: true,
    descriptiveAnalysis: true,
  }))
  const [isExporting, setIsExporting] = useState(false)
  const [exportLoadingState, setExportLoadingState] = useState<ExportLoadingState | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: true })

      if (data) setReports(data)
      setIsLoading(false)
    }

    fetchReports()
  }, [supabase])

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")

  const normalizeStatus = (status?: string | null) => status || "pending"

  const handleExportSectionChange =
    (key: ExportSectionKey) => (checked: boolean | "indeterminate") => {
      setExportSections((prev) => ({ ...prev, [key]: checked === true }))
    }

  // Bullying type distribution (selectable date range)
  const { typeData, isTypeDistRangeValid } = (() => {
    const empty = { typeData: [] as { name: string; value: number }[], isTypeDistRangeValid: false }
    if (!typeDistStart || !typeDistEnd) return empty

    const startDate = new Date(typeDistStart)
    const endDate = new Date(typeDistEnd)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return empty

    const filteredReports = reports.filter((r) => {
      const reportDate = r.created_at?.split("T")[0]
      if (!reportDate) return false
      return reportDate >= typeDistStart && reportDate <= typeDistEnd
    })

    const data = filteredReports.reduce((acc: { name: string; value: number }[], report) => {
      const existing = acc.find((item) => item.name === report.bullying_type)
      if (existing) {
        existing.value++
      } else if (report.bullying_type) {
        acc.push({ name: report.bullying_type, value: 1 })
      }
      return acc
    }, [])

    return { typeData: data, isTypeDistRangeValid: true }
  })()

  // Monthly trend (selectable range)
  const monthlyData = (() => {
    if (!monthlyStart || !monthlyEnd) return []

    const [startYear, startMonth] = monthlyStart.split("-").map(Number)
    const [endYear, endMonth] = monthlyEnd.split("-").map(Number)
    const startDate = new Date(startYear, startMonth - 1, 1)
    const endDate = new Date(endYear, endMonth - 1, 1)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return []

    const months: { month: string; reports: number }[] = []
    const cursor = new Date(startDate)

    while (cursor <= endDate && months.length < 36) {
      const monthLabel = cursor.toLocaleString("en-US", { month: "short" })
      const yearLabel = cursor.getFullYear().toString().slice(-2)
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)

      const count = reports.filter((r) => {
        const reportDate = new Date(r.created_at)
        return reportDate >= monthStart && reportDate <= monthEnd
      }).length

      months.push({ month: `${monthLabel} '${yearLabel}`, reports: count })
      cursor.setMonth(cursor.getMonth() + 1)
    }

    return months
  })()

  // Daily trend (selectable date range)
  const dailyData = (() => {
    if (!dailyStart || !dailyEnd) return []

    const startDate = new Date(dailyStart)
    const endDate = new Date(dailyEnd)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return []

    const rows: { date: string; reports: number }[] = []
    const cursor = new Date(startDate)

    while (cursor <= endDate && rows.length < 120) {
      const dateStr = cursor.toISOString().split("T")[0]
      const count = reports.filter((r) => r.created_at.split("T")[0] === dateStr).length

      rows.push({
        date: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        reports: count,
      })

      cursor.setDate(cursor.getDate() + 1)
    }

    return rows
  })()

  const { exportReports, exportRangeLabel, isExportRangeValid, exportDayCount } = (() => {
    const empty = {
      exportReports: [] as Report[],
      exportRangeLabel: "",
      isExportRangeValid: false,
      exportDayCount: 0,
    }
    if (!exportStart || !exportEnd) return empty

    const startDate = new Date(exportStart)
    const endDate = new Date(exportEnd)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return empty

    const startLabel = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    const endLabel = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    const msPerDay = 1000 * 60 * 60 * 24
    const dayCount = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1

    const filtered = reports.filter((report) => {
      const reportDate = report.created_at?.split("T")[0]
      if (!reportDate) return false
      return reportDate >= exportStart && reportDate <= exportEnd
    })

    return {
      exportReports: filtered,
      exportRangeLabel: `${startLabel} - ${endLabel}`,
      isExportRangeValid: true,
      exportDayCount: dayCount,
    }
  })()

  const exportSummary = exportReports.reduce(
    (acc, report) => {
      const status = normalizeStatus(report.status)
      acc.total += 1
      if (status === "resolved") acc.resolved += 1
      else if (status === "in_progress") acc.inProgress += 1
      else acc.pending += 1
      return acc
    },
    { total: 0, pending: 0, inProgress: 0, resolved: 0 },
  )

  const exportTypeDistribution = (() => {
    const data = exportReports.reduce((acc: { name: string; value: number }[], report) => {
      const existing = acc.find((item) => item.name === report.bullying_type)
      if (existing) {
        existing.value += 1
      } else if (report.bullying_type) {
        acc.push({ name: report.bullying_type, value: 1 })
      }
      return acc
    }, [])

    return data.sort((a, b) => b.value - a.value)
  })()

  const exportMonthlyTrend = (() => {
    if (!isExportRangeValid) return []

    const startDate = new Date(exportStart)
    const endDate = new Date(exportEnd)
    const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

    const rows: { month: string; reports: number }[] = []
    const cursor = new Date(startMonth)

    while (cursor <= endMonth && rows.length < 36) {
      const monthLabel = cursor.toLocaleString("en-US", { month: "short" })
      const yearLabel = cursor.getFullYear().toString().slice(-2)
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)

      const count = exportReports.filter((report) => {
        const reportDate = new Date(report.created_at)
        return reportDate >= monthStart && reportDate <= monthEnd
      }).length

      rows.push({ month: `${monthLabel} '${yearLabel}`, reports: count })
      cursor.setMonth(cursor.getMonth() + 1)
    }

    return rows
  })()

  const exportDailyActivity = (() => {
    if (!isExportRangeValid) return { rows: [] as { date: string; iso: string; reports: number }[], isTruncated: false }

    const rows: { date: string; iso: string; reports: number }[] = []
    const startDate = new Date(exportStart)
    const endDate = new Date(exportEnd)
    const cursor = new Date(startDate)
    let isTruncated = false

    while (cursor <= endDate) {
      if (rows.length >= 120) {
        isTruncated = true
        break
      }
      const iso = cursor.toISOString().split("T")[0]
      const count = exportReports.filter((report) => report.created_at.split("T")[0] === iso).length

      rows.push({
        iso,
        date: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        reports: count,
      })

      cursor.setDate(cursor.getDate() + 1)
    }

    return { rows, isTruncated }
  })()

  const hasSelectedExportSections = Object.values(exportSections).some(Boolean)

  const descriptiveAnalysis = (() => {
    if (!isExportRangeValid) {
      return ["Select a valid timeline to generate descriptive analysis."]
    }

    if (exportReports.length === 0) {
      return ["No reports were submitted in the selected timeline."]
    }

    const insights: string[] = []
    const avgPerDay = exportDayCount ? exportSummary.total / exportDayCount : exportSummary.total

    insights.push(
      `${exportSummary.total} reports recorded between ${exportRangeLabel} (avg ${avgPerDay.toFixed(1)} per day).`,
    )

    const topType = exportTypeDistribution[0]
    if (topType) {
      const share = exportSummary.total ? (topType.value / exportSummary.total) * 100 : 0
      insights.push(`${topType.name} is the most common type (${topType.value} reports, ${share.toFixed(0)}%).`)
      if (share >= 35) {
        insights.push(`This suggests a recurring issue in ${topType.name} incidents. Consider targeted prevention and education for this category.`)
      }
    }

    if (exportMonthlyTrend.length > 1) {
      const first = exportMonthlyTrend[0]
      const last = exportMonthlyTrend[exportMonthlyTrend.length - 1]
      const delta = last.reports - first.reports
      if (delta > 0) {
        insights.push(`Monthly volume increased by ${delta} from ${first.month} to ${last.month}.`)
      } else if (delta < 0) {
        insights.push(`Monthly volume decreased by ${Math.abs(delta)} from ${first.month} to ${last.month}.`)
      } else {
        insights.push(`Monthly volume held steady at ${first.reports} from ${first.month} to ${last.month}.`)
      }
    }

    const peakDay = exportDailyActivity.rows.reduce(
      (max, row) => (row.reports > max.reports ? row : max),
      { date: "", iso: "", reports: -1 },
    )
    if (peakDay.reports >= 0) {
      insights.push(`Highest daily activity: ${peakDay.reports} reports on ${peakDay.date}.`)
    }

    const resolvedRate = exportSummary.total ? (exportSummary.resolved / exportSummary.total) * 100 : 0
    const inProgressRate = exportSummary.total ? (exportSummary.inProgress / exportSummary.total) * 100 : 0
    const pendingRate = exportSummary.total ? (exportSummary.pending / exportSummary.total) * 100 : 0
    insights.push(
      `Status mix: ${resolvedRate.toFixed(0)}% resolved, ${inProgressRate.toFixed(0)}% in progress, ${pendingRate.toFixed(0)}% pending.`,
    )

    const resolutionMethods = [
      { label: "counseling or mediation", regex: /counsel|medi(ation|ator|ate|ation)/i },
      { label: "parent / guardian contact", regex: /parent|guardian|family|home communication/i },
      { label: "staff intervention", regex: /teacher|staff|counselor|administrator|supervisor/i },
      { label: "safety planning", regex: /safety plan|safety measures|secure|protect/i },
      { label: "disciplinary follow-up", regex: /warning|consequence|disciplin|restorative/i },
    ]
    const resolvedReports = exportReports.filter((report) => report.status === "resolved")
    const resolutionText = resolvedReports
      .map((report) => report.resolution_description?.trim().toLowerCase() || "")
      .join(" ")
    const methodMatches = resolutionMethods
      .map((method) => ({ label: method.label, count: (resolutionText.match(method.regex) || []).length }))
      .filter((method) => method.count > 0)
      .sort((a, b) => b.count - a.count)

    if (resolvedReports.length > 0) {
      if (methodMatches.length > 0) {
        const listedMethods = methodMatches.slice(0, 3).map((method) => method.label).join(", ")
        insights.push(`Common resolution methods include ${listedMethods}.`)
      } else if (resolvedReports.some((report) => report.resolution_description?.trim())) {
        insights.push("Resolution notes indicate a range of follow-up actions, with many cases resolved through direct staff communication and follow-up.")
      } else {
        insights.push("A number of resolved reports have no detailed resolution notes; standardized resolution documentation would improve clarity.")
      }

      const documentedResolutions = resolvedReports.filter((report) => report.resolution_description?.trim())
      const documentedPercent = resolvedReports.length
        ? (documentedResolutions.length / resolvedReports.length) * 100
        : 0
      if (documentedPercent < 60) {
        insights.push(
          `Only ${documentedPercent.toFixed(0)}% of resolved cases include descriptive resolution notes. Encourage staff to record outcomes consistently to improve follow-up and accountability.`,
        )
      }
    } else {
      insights.push(
        "No resolved incidents were recorded in this range. Prioritize follow-up and formal closure for reports that are still pending or in progress.",
      )
    }

    if (pendingRate > 40) {
      insights.push(
        "A high share of reports remain pending. Review case assignment and follow-up workflows to ensure timely response and resolution.",
      )
    }

    if (inProgressRate > 25) {
      insights.push(
        "Several incidents are actively being worked on. Maintain regular progress checks and clear next steps for each in-progress case.",
      )
    }

    if (topType && topType.value / exportSummary.total >= 0.25) {
      insights.push(
        `Focus prevention efforts on ${topType.name} incidents, as they account for a large share of cases and may point to a systemic concern.`,
      )
    }

    if (exportTypeDistribution.length > 1) {
      const recurringTypes = exportTypeDistribution.slice(0, 2).map((item) => item.name)
      insights.push(`Recurring issues are found in ${recurringTypes.join(" and ")} cases; strengthen training and communications for these categories.`)
    }

    insights.push(
      "Recommended improvements: increase preventive education for the most common incident types, ensure resolution outcomes are documented, and use trends to assign more targeted support to affected students.",
    )

    return insights
  })()

  const analysisSections = (() => {
    const categories = [
      {
        title: "Observations",
        matcher: /(reports recorded|highest daily activity|status mix|resolution notes|no resolved incidents|recurring issue|monthly volume|daily activity)/i,
      },
      {
        title: "Trends",
        matcher: /(volume increased|volume decreased|held steady|recurring issues|daily activity|monthly volume|trend|share|pattern)/i,
      },
      {
        title: "Recommendations",
        matcher: /(recommend|encourage|review|focus|maintain|ensure|prioritize|improve|prevent|strengthen|document|follow-up|support)/i,
      },
    ]

    const sectionItems = categories.map((category) => ({ title: category.title, items: [] as string[] }))

    descriptiveAnalysis.forEach((item) => {
      const categoryIndex = categories.findIndex((category) => category.matcher.test(item))
      if (categoryIndex >= 0) {
        sectionItems[categoryIndex].items.push(item)
      } else {
        sectionItems[0].items.push(item)
      }
    })

    return sectionItems.map((section) => ({
      title: section.title,
      items: section.items.length > 0 ? section.items : [`No ${section.title.toLowerCase()} available for the selected timeline.`],
    }))
  })()

  const handlePrintDataReport = async () => {
    if (!isExportRangeValid || !hasSelectedExportSections) return

    setPreviewHtml(null)
    setIsExporting(true)
    setExportLoadingState({
      progress: 8,
      description: "Opening a print workspace for the export.",
    })

    try {
      // Yield between stages so React can paint the loading screen before each chunk of work.
      await waitForNextPaint()

      setExportLoadingState({
        progress: 28,
        description: "Compiling the selected report sections.",
      })
      await waitForNextPaint()

      const summarySection = `
        <h2>Summary Statistics</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">Total Reports</div>
            <div class="value">${exportSummary.total}</div>
          </div>
          <div class="summary-item">
            <div class="label">Pending</div>
            <div class="value">${exportSummary.pending}</div>
          </div>
          <div class="summary-item">
            <div class="label">In Progress</div>
            <div class="value">${exportSummary.inProgress}</div>
          </div>
          <div class="summary-item">
            <div class="label">Resolved</div>
            <div class="value">${exportSummary.resolved}</div>
          </div>
        </div>
      `

      const monthlyRows = exportMonthlyTrend
        .map((row) => `<tr><td>${row.month}</td><td>${row.reports}</td></tr>`)
        .join("")
      const monthlySection = `
        <h2>Monthly Trend</h2>
        ${exportMonthlyTrend.length > 0 ? `<table><thead><tr><th>Month</th><th>Reports</th></tr></thead><tbody>${monthlyRows}</tbody></table>` : "<p class=\"muted\">No data for selected timeline.</p>"}
      `

      const typeRows = exportTypeDistribution
        .map((row) => {
          const share = exportSummary.total ? ((row.value / exportSummary.total) * 100).toFixed(0) : "0"
          return `<tr><td>${escapeHtml(row.name)}</td><td>${row.value}</td><td>${share}%</td></tr>`
        })
        .join("")
      const typeSection = `
        <h2>Incident Categories</h2>
        ${exportTypeDistribution.length > 0 ? `<table><thead><tr><th>Type</th><th>Reports</th><th>Share</th></tr></thead><tbody>${typeRows}</tbody></table>` : "<p class=\"muted\">No data for selected timeline.</p>"}
      `

      const dailyRows = exportDailyActivity.rows
        .map((row) => `<tr><td>${row.date}</td><td>${row.reports}</td></tr>`)
        .join("")
      const dailyNote = exportDailyActivity.isTruncated ? "<p class=\"muted\">Showing first 120 days.</p>" : ""
      const dailySection = `
        <h2>Daily Activity</h2>
        ${exportDailyActivity.rows.length > 0 ? `<table><thead><tr><th>Date</th><th>Reports</th></tr></thead><tbody>${dailyRows}</tbody></table>${dailyNote}` : "<p class=\"muted\">No data for selected timeline.</p>"}
      `

      const analysisItems = descriptiveAnalysis
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")
      const analysisSection = `
        <h2>Descriptive Analysis</h2>
        <ul>${analysisItems}</ul>
      `

      const sectionsHtml = [
        exportSections.summary ? summarySection : "",
        exportSections.monthlyTrend ? monthlySection : "",
        exportSections.typeDistribution ? typeSection : "",
        exportSections.dailyActivity ? dailySection : "",
        exportSections.descriptiveAnalysis ? analysisSection : "",
      ]
        .filter(Boolean)
        .join("")

      setExportLoadingState({
        progress: 62,
        description: "Building the printable document.",
      })
      await waitForNextPaint()

      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>SafeVoice Data Report</title>
            <style>
              body { font-family: Arial, sans-serif; color: #111; margin: 24px; line-height: 1.45; }
              h1 { margin: 0 0 6px 0; font-size: 22px; }
              h2 { margin: 24px 0 8px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
              .muted { color: #666; font-size: 12px; }
              .meta { margin-bottom: 16px; font-size: 13px; color: #444; }
              .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin-top: 8px; }
              .summary-item { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; background: #fafafa; }
              .summary-item .label { font-size: 12px; color: #666; }
              .summary-item .value { font-size: 18px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
              th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
              th { background: #f3f4f6; }
              ul { padding-left: 20px; margin-top: 8px; }
              li { margin-bottom: 6px; }
              @media print { body { margin: 12mm; } a { color: #111; text-decoration: none; } }
            </style>
          </head>
          <body>
            <h1>SafeVoice Data Report</h1>
            <div class="meta">
              <div><strong>Timeline:</strong> ${escapeHtml(exportRangeLabel)}</div>
              <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            </div>
            ${sectionsHtml}
          </body>
        </html>
      `

      setExportLoadingState({
        progress: 88,
        description: "Preparing preview.",
      })
      await waitForNextPaint()

      setPreviewHtml(printHtml)

      setExportLoadingState({
        progress: 100,
        description: "Preview is ready.",
      })
      await waitForNextPaint()
    } finally {
      setIsExporting(false)
      setExportLoadingState(null)
    }
  }

  const handlePrintPreview = () => {
    const frame = previewFrameRef.current
    if (!frame?.contentWindow) return

    frame.contentWindow.focus()
    frame.contentWindow.print()
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {exportLoadingState && (
        <LoadingScreen
          mode="overlay"
          title="Preparing data report"
          description={exportLoadingState.description}
          progress={exportLoadingState.progress}
        />
      )}

      <Dialog open={Boolean(previewHtml)} onOpenChange={(open) => !open && setPreviewHtml(null)}>
        <DialogContent className="grid grid-rows-[auto_auto_1fr] h-[min(90vh,calc(100vh-4rem))] w-[min(80vw,72rem)] max-w-[80vw] overflow-hidden bg-slate-900 border border-slate-700 p-0">
          <DialogHeader className="border-b border-slate-700 px-6 py-4">
            <DialogTitle className="text-white">Export preview</DialogTitle>
            <DialogDescription className="text-slate-400">
              Review the generated report and print or close when ready.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-6 py-3">
            <p className="text-sm text-slate-400">Preview is scrollable when content is large.</p>
            <Button onClick={handlePrintPreview} disabled={!previewHtml} className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700">
              Print / Save PDF
            </Button>
          </div>
          <div className="overflow-hidden bg-white">
            {previewHtml ? (
              <iframe
                ref={previewFrameRef}
                title="SafeVoice data report preview"
                srcDoc={previewHtml}
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-10 text-slate-400">Loading preview…</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-black">Data Reports</h1>
          <p className="text-black">Analytics, trends, and export tools for bullying incident data</p>
        </div>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/reports?status=all" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-300 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{reports.length}</p>
                <p className="text-sm text-slate-400">Total Reports</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/reports?status=pending" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-300 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">
                  {reports.filter((r) => r.status === "pending" || !r.status).length}
                </p>
                <p className="text-sm text-slate-400">Pending</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/reports?status=in_progress" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-violet-300 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-violet-600">
                  {reports.filter((r) => r.status === "in_progress").length}
                </p>
                <p className="text-sm text-slate-400">In Progress</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/reports?status=resolved" className="block">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-300 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">
                  {reports.filter((r) => r.status === "resolved").length}
                </p>
                <p className="text-sm text-slate-400">Resolved</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Export Controls */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Export Report</CardTitle>
            <CardDescription className="text-slate-400">
              Export a PDF for the selected incident timeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-2">Timeline</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={exportStart}
                      onChange={(e) => setExportStart(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                    />
                    <Input
                      type="date"
                      value={exportEnd}
                      onChange={(e) => setExportEnd(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="export-summary"
                      checked={exportSections.summary}
                      onCheckedChange={handleExportSectionChange("summary")}
                    />
                    <Label htmlFor="export-summary" className="text-slate-200">
                      Summary
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="export-monthly"
                      checked={exportSections.monthlyTrend}
                      onCheckedChange={handleExportSectionChange("monthlyTrend")}
                    />
                    <Label htmlFor="export-monthly" className="text-slate-200">
                      Monthly trend
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="export-type"
                      checked={exportSections.typeDistribution}
                      onCheckedChange={handleExportSectionChange("typeDistribution")}
                    />
                    <Label htmlFor="export-type" className="text-slate-200">
                      Incident categories
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="export-daily"
                      checked={exportSections.dailyActivity}
                      onCheckedChange={handleExportSectionChange("dailyActivity")}
                    />
                    <Label htmlFor="export-daily" className="text-slate-200">
                      Daily activity
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="export-analysis"
                      checked={exportSections.descriptiveAnalysis}
                      onCheckedChange={handleExportSectionChange("descriptiveAnalysis")}
                    />
                    <Label htmlFor="export-analysis" className="text-slate-200">
                      Analysis
                    </Label>
                  </div>
                </div>

                {!isExportRangeValid && (
                  <p className="text-xs text-amber-300">Select a valid timeline to enable export.</p>
                )}
                {isExportRangeValid && !hasSelectedExportSections && (
                  <p className="text-xs text-amber-300">Select at least one section to include.</p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrintDataReport}
                  disabled={isExporting || !isExportRangeValid || !hasSelectedExportSections}
                  className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {isExporting ? "Preparing..." : "Print / Save PDF"}
                </Button>
              </div>

              <div className="rounded-lg bg-slate-700/30 border border-slate-600 p-4">
                <p className="text-xs text-slate-400 mb-2">Export options are applied to the selected timeline</p>
                <p className="text-sm text-slate-100 leading-6">
                  Select the sections to include in the PDF report. The analysis section captures resolution trends, recurring issues, and recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-white">Monthly Trend</CardTitle>
                <CardDescription className="text-slate-400">
                  Report volume across the selected months
                </CardDescription>
              </div>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                <Input
                  type="month"
                  value={monthlyStart}
                  onChange={(e) => setMonthlyStart(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white w-full sm:w-40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
                <Input
                  type="month"
                  value={monthlyEnd}
                  onChange={(e) => setMonthlyEnd(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white w-full sm:w-40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ADMIN_CHART_COLORS[0]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={ADMIN_CHART_COLORS[0]} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={ADMIN_CHART_GRID} />
                      <XAxis dataKey="month" stroke={ADMIN_CHART_AXIS} fontSize={12} />
                      <YAxis stroke={ADMIN_CHART_AXIS} fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: ADMIN_CHART_SURFACE,
                          border: `1px solid ${ADMIN_CHART_BORDER}`,
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: ADMIN_CHART_TEXT }}
                        itemStyle={{ color: ADMIN_CHART_TEXT }}
                      />
                      <Area
                        type="monotone"
                        dataKey="reports"
                        stroke={ADMIN_CHART_COLORS[0]}
                        fillOpacity={1}
                        fill="url(#colorReports)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    Select a valid month range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bullying Type Pie Chart */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-white">Incident Categories</CardTitle>
                <CardDescription className="text-slate-400">Distribution of bullying types over the selected range</CardDescription>
              </div>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                <Input
                  type="date"
                  value={typeDistStart}
                  onChange={(e) => setTypeDistStart(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white w-full sm:w-40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
                <Input
                  type="date"
                  value={typeDistEnd}
                  onChange={(e) => setTypeDistEnd(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white w-full sm:w-40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {!isTypeDistRangeValid ? (
                  <div className="h-full flex items-center justify-center text-slate-500">Select a valid date range</div>
                ) : typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${Number.isFinite(percent) ? (percent * 100).toFixed(0) : 0}%`
                        }
                        labelLine={false}
                      >
                        {typeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: ADMIN_CHART_SURFACE,
                          border: `1px solid ${ADMIN_CHART_BORDER}`,
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: ADMIN_CHART_TEXT }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    No data available for selected date range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Daily Trend */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-white">Daily Activity</CardTitle>
                <CardDescription className="text-slate-400">Daily report volume for the selected range</CardDescription>
              </div>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                <Input
                  type="date"
                  value={dailyStart}
                  onChange={(e) => setDailyStart(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white w-full sm:w-40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
                <Input
                  type="date"
                  value={dailyEnd}
                  onChange={(e) => setDailyEnd(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white w-full sm:w-40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ADMIN_CHART_GRID} />
                      <XAxis dataKey="date" stroke={ADMIN_CHART_AXIS} fontSize={10} angle={-45} textAnchor="end" height={60} />
                      <YAxis stroke={ADMIN_CHART_AXIS} fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: ADMIN_CHART_SURFACE,
                          border: `1px solid ${ADMIN_CHART_BORDER}`,
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: ADMIN_CHART_TEXT }}
                        itemStyle={{ color: ADMIN_CHART_TEXT }}
                      />
                      <Bar dataKey="reports" fill={ADMIN_CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    Select a valid date range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Descriptive Analysis */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Descriptive Analysis</CardTitle>
            <CardDescription className="text-slate-400">
              Observations, trends, and recommendations for the current report timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-3">
              {analysisSections.map((section) => (
                <div key={section.title} className="space-y-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                  <ul className="list-disc list-inside text-sm text-slate-100 space-y-2">
                    {section.items.map((item, index) => (
                      <li key={`${section.title}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  )
}
