"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  | "typeOverTime"
  | "descriptiveAnalysis"

type ExportSectionsState = Record<ExportSectionKey, boolean>

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
  const [typeTrendStart, setTypeTrendStart] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 5)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  })
  const [typeTrendEnd, setTypeTrendEnd] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  })
  const [selectedTypeTrend, setSelectedTypeTrend] = useState("all")
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
    typeOverTime: true,
    descriptiveAnalysis: true,
  }))
  const [isExporting, setIsExporting] = useState(false)
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

  const allTypes = [
    ...new Set(reports.map((r) => r.bullying_type).filter((type): type is string => Boolean(type))),
  ]

  // Type by month for stacked chart with date range + type filter
  const typeByMonth = (() => {
    if (!typeTrendStart || !typeTrendEnd) return []

    const [startYear, startMonth] = typeTrendStart.split("-").map(Number)
    const [endYear, endMonth] = typeTrendEnd.split("-").map(Number)
    const startDate = new Date(startYear, startMonth - 1, 1)
    const endDate = new Date(endYear, endMonth - 1, 1)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return []

    const selectedTypes = selectedTypeTrend === "all" ? allTypes : [selectedTypeTrend]
    const filteredReports = reports.filter((r) => {
      const reportDate = new Date(r.created_at)
      return (
        reportDate >= new Date(startDate.getFullYear(), startDate.getMonth(), 1) &&
        reportDate <= new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0) &&
        (selectedTypeTrend === "all" || r.bullying_type === selectedTypeTrend)
      )
    })

    const rows: { [key: string]: string | number }[] = []
    const cursor = new Date(startDate)

    while (cursor <= endDate && rows.length < 36) {
      const monthLabel = cursor.toLocaleString("en-US", { month: "short" })
      const yearLabel = cursor.getFullYear().toString().slice(-2)
      const monthStartDate = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      const monthEndDate = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const row: { [key: string]: string | number } = { month: `${monthLabel} '${yearLabel}` }

      selectedTypes.forEach((type) => {
        row[type] = filteredReports.filter((r) => {
          const reportDate = new Date(r.created_at)
          return r.bullying_type === type && reportDate >= monthStartDate && reportDate <= monthEndDate
        }).length
      })

      rows.push(row)
      cursor.setMonth(cursor.getMonth() + 1)
    }

    return rows
  })()

  const visibleTypeKeys = selectedTypeTrend === "all" ? allTypes : [selectedTypeTrend]

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

  const exportTypes = [
    ...new Set(exportReports.map((report) => report.bullying_type).filter((type): type is string => Boolean(type))),
  ]
  const exportTypeKeys =
    selectedTypeTrend === "all"
      ? exportTypes
      : [selectedTypeTrend].filter((type): type is string => Boolean(type))

  const exportTypeOverTime = (() => {
    if (!isExportRangeValid) return []
    if (exportTypeKeys.length === 0) return []

    const startDate = new Date(exportStart)
    const endDate = new Date(exportEnd)
    const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

    const rows: { [key: string]: string | number }[] = []
    const cursor = new Date(startMonth)

    while (cursor <= endMonth && rows.length < 36) {
      const monthLabel = cursor.toLocaleString("en-US", { month: "short" })
      const yearLabel = cursor.getFullYear().toString().slice(-2)
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const row: { [key: string]: string | number } = { month: `${monthLabel} '${yearLabel}` }

      exportTypeKeys.forEach((type) => {
        row[type] = exportReports.filter((report) => {
          const reportDate = new Date(report.created_at)
          return report.bullying_type === type && reportDate >= monthStart && reportDate <= monthEnd
        }).length
      })

      rows.push(row)
      cursor.setMonth(cursor.getMonth() + 1)
    }

    return rows
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

    return insights
  })()

  const handlePrintDataReport = async () => {
    if (!isExportRangeValid || !hasSelectedExportSections) return

    setIsExporting(true)

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

    const typeOverTimeHeader = exportTypeKeys.map((type) => `<th>${escapeHtml(type)}</th>`).join("")
    const typeOverTimeRows = exportTypeOverTime
      .map((row) => {
        const cells = exportTypeKeys.map((type) => `<td>${row[type] ?? 0}</td>`).join("")
        return `<tr><td>${row.month}</td>${cells}</tr>`
      })
      .join("")
    const typeOverTimeSection = `
      <h2>Incident Types Over Time</h2>
      ${exportTypeOverTime.length > 0 ? `<table><thead><tr><th>Month</th>${typeOverTimeHeader}</tr></thead><tbody>${typeOverTimeRows}</tbody></table>` : "<p class=\"muted\">No data for selected timeline.</p>"}
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
      exportSections.typeOverTime ? typeOverTimeSection : "",
      exportSections.descriptiveAnalysis ? analysisSection : "",
    ]
      .filter(Boolean)
      .join("")

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

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      setIsExporting(false)
      return
    }

    printWindow.document.open()
    printWindow.document.write(printHtml)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()

    setIsExporting(false)
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#800000]">Data Reports</h1>
          <p className="text-[#8f6060]">Comprehensive analytics and visualizations of bullying reports</p>
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

        {/* Descriptive Analysis + Export */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Descriptive Analysis & Export</CardTitle>
            <CardDescription className="text-slate-400">
              Generate insights and export a PDF report for a selected timeline
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
                      Summary stats
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
                      id="export-type-over-time"
                      checked={exportSections.typeOverTime}
                      onCheckedChange={handleExportSectionChange("typeOverTime")}
                    />
                    <Label htmlFor="export-type-over-time" className="text-slate-200">
                      Incident types over time
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="export-analysis"
                      checked={exportSections.descriptiveAnalysis}
                      onCheckedChange={handleExportSectionChange("descriptiveAnalysis")}
                    />
                    <Label htmlFor="export-analysis" className="text-slate-200">
                      Descriptive analysis
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
                <p className="text-xs text-slate-400 mb-2">
                  Descriptive analysis {isExportRangeValid ? `(${exportRangeLabel})` : ""}
                </p>
                {descriptiveAnalysis.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-slate-100 space-y-1">
                    {descriptiveAnalysis.map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No analysis available.</p>
                )}
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
                  Reports between selected months
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
                <CardDescription className="text-slate-400">Distribution by bullying type between selected dates</CardDescription>
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
                <CardDescription className="text-slate-400">Reports between selected dates</CardDescription>
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

        {/* Type by Month Stacked Chart */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-col gap-3">
            <div>
              <CardTitle className="text-white">Incident Types Over Time</CardTitle>
              <CardDescription className="text-slate-400">Monthly breakdown by bullying category</CardDescription>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Select value={selectedTypeTrend} onValueChange={setSelectedTypeTrend}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Filter type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">All Types</SelectItem>
                  {allTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-white">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="month"
                value={typeTrendStart}
                onChange={(e) => setTypeTrendStart(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
              />
              <Input
                type="month"
                value={typeTrendEnd}
                onChange={(e) => setTypeTrendEnd(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {visibleTypeKeys.length > 0 && typeByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeByMonth}>
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
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
                    />
                    {visibleTypeKeys.map((type, index) => (
                      <Bar
                        key={type}
                        dataKey={type}
                        stackId="a"
                        fill={ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length]}
                        radius={index === visibleTypeKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  No data available for selected type/date range
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
