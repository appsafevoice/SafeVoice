"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatReportStatusLabel } from "@/lib/report-status"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  ADMIN_CHART_AXIS,
  ADMIN_CHART_BORDER,
  ADMIN_CHART_COLORS,
  ADMIN_CHART_GRID,
  ADMIN_CHART_SURFACE,
  ADMIN_CHART_TEXT,
} from "@/lib/admin-theme"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { FileText, TrendingUp, Clock, Megaphone } from "lucide-react"

interface Report {
  id: string
  bullying_type: string
  status: string
  created_at: string
  details: string
  reporter_name: string | null
}

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  created_at: string
  is_active: boolean
}

export default function AdminDashboardPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [categoryStart, setCategoryStart] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 29)
    return date.toISOString().split("T")[0]
  })
  const [categoryEnd, setCategoryEnd] = useState(() => {
    const date = new Date()
    return date.toISOString().split("T")[0]
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      // Fetch reports - using service role would be needed for admin access
      // For now, fetching what's available
      const { data: reportsData } = await supabase.from("reports").select("*").order("created_at", { ascending: false })

      const { data: announcementsData } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })

      if (reportsData) setReports(reportsData)
      if (announcementsData) setAnnouncements(announcementsData)
      setIsLoading(false)
    }

    fetchData()
  }, [supabase])

  // Process data for charts
  const { bullyingTypeData, isCategoryRangeValid } = (() => {
    const empty = { bullyingTypeData: [] as { name: string; value: number }[], isCategoryRangeValid: false }
    if (!categoryStart || !categoryEnd) return empty

    const startDate = new Date(categoryStart)
    const endDate = new Date(categoryEnd)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return empty

    const filteredReports = reports.filter((r) => {
      const reportDate = r.created_at?.split("T")[0]
      if (!reportDate) return false
      return reportDate >= categoryStart && reportDate <= categoryEnd
    })

    const data = filteredReports.reduce((acc: { name: string; value: number }[], report) => {
      const existing = acc.find((item) => item.name === report.bullying_type)
      if (existing) {
        existing.value++
      } else {
        acc.push({ name: report.bullying_type || "Unknown", value: 1 })
      }
      return acc
    }, [])

    return { bullyingTypeData: data, isCategoryRangeValid: true }
  })()

  const statusData = reports.reduce((acc: { name: string; value: number }[], report) => {
    const existing = acc.find((item) => item.name === report.status)
    if (existing) {
      existing.value++
    } else {
      acc.push({ name: report.status || "pending", value: 1 })
    }
    return acc
  }, [])

  // Weekly trend data (last 7 days)
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().split("T")[0]
    const count = reports.filter((r) => r.created_at.split("T")[0] === dateStr).length
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      reports: count,
    }
  })

  const stats = [
    {
      title: "Total Reports",
      value: reports.length,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      hoverBorder: "hover:border-blue-300",
      href: "/admin/reports",
    },
    {
      title: "Pending Review",
      value: reports.filter((r) => r.status === "pending").length,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      hoverBorder: "hover:border-amber-300",
      href: "/admin/reports?status=pending",
    },
    {
      title: "Resolved Cases",
      value: reports.filter((r) => r.status === "resolved").length,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      hoverBorder: "hover:border-emerald-300",
      href: "/admin/reports?status=resolved",
    },
    {
      title: "Active Post",
      value: announcements.filter((a) => a.is_active).length,
      icon: Megaphone,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
      hoverBorder: "hover:border-violet-300",
      href: "/admin/content",
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-black">Dashboard Overview</h1>
          <p className="text-black">Monitor bullying reports and manage counselor communications</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link key={stat.title} href={stat.href} className="block">
              <Card className={`bg-slate-800/50 border-slate-700 transition-colors cursor-pointer ${stat.hoverBorder}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-slate-400">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekly Trend */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Weekly Report Trend</CardTitle>
              <CardDescription className="text-slate-400">Reports submitted in the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ADMIN_CHART_GRID} />
                    <XAxis dataKey="day" stroke={ADMIN_CHART_AXIS} fontSize={12} />
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
                    <Line
                      type="monotone"
                      dataKey="reports"
                      stroke={ADMIN_CHART_COLORS[0]}
                      strokeWidth={2}
                      dot={{ fill: ADMIN_CHART_COLORS[0] }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bullying Type Distribution */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-white">Bullying Type Distribution</CardTitle>
                <CardDescription className="text-slate-400">Breakdown by incident category between selected dates</CardDescription>
              </div>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                <Input
                  type="date"
                  value={categoryStart}
                  onChange={(e) => setCategoryStart(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white w-full sm:w-40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
                <Input
                  type="date"
                  value={categoryEnd}
                  onChange={(e) => setCategoryEnd(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white w-full sm:w-40 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {!isCategoryRangeValid ? (
                  <div className="h-full flex items-center justify-center text-slate-500">Select a valid date range</div>
                ) : bullyingTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bullyingTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => {
                          const percentValue = typeof percent === "number" ? percent : 0
                          return `${name} ${(percentValue * 100).toFixed(0)}%`
                        }}
                        labelLine={false}
                      >
                        {bullyingTypeData.map((_, index) => (
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
        </div>

        {/* Recent Posts & Updates */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Reports</CardTitle>
              <CardDescription className="text-slate-400">Latest submitted incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.slice(0, 5).map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {report.bullying_type || "Incident Report"}
                      </p>
                      <p className="text-xs text-slate-400">{new Date(report.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        report.status === "resolved"
                          ? "border-green-500 text-green-400"
                          : report.status === "in_progress"
                            ? "border-amber-500 text-amber-400"
                            : "border-slate-500 text-slate-400"
                      }
                    >
                      {formatReportStatusLabel(report.status)}
                    </Badge>
                  </div>
                ))}
                {reports.length === 0 && <p className="text-center text-slate-500 py-4">No reports yet</p>}
              </div>
            </CardContent>
          </Card>

          {/* Counselor Messages */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Counselor Updates</CardTitle>
              <CardDescription className="text-slate-400">Recent announcements and messages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {announcements.slice(0, 5).map((announcement) => (
                  <div key={announcement.id} className="p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-white">{announcement.title}</p>
                      {announcement.is_active && (
                        <Badge className="bg-green-500/20 text-green-400 border-0">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{announcement.content}</p>
                  </div>
                ))}
                {announcements.length === 0 && <p className="text-center text-slate-500 py-4">No announcements yet</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
