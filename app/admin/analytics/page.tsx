"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
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

const COLORS = ["#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6", "#22c55e", "#ec4899"]

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

  // Bullying type distribution
  const typeData = reports.reduce((acc: { name: string; value: number }[], report) => {
    const existing = acc.find((item) => item.name === report.bullying_type)
    if (existing) {
      existing.value++
    } else if (report.bullying_type) {
      acc.push({ name: report.bullying_type, value: 1 })
    }
    return acc
  }, [])

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

  const allTypes = [...new Set(reports.map((r) => r.bullying_type).filter(Boolean))]

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
          <h1 className="text-2xl font-bold text-white">Data Reports</h1>
          <p className="text-slate-400">Comprehensive analytics and visualizations of bullying reports</p>
        </div>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-cyan-400">{reports.length}</p>
              <p className="text-sm text-slate-400">Total Reports</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">
                {reports.filter((r) => r.status === "pending" || !r.status).length}
              </p>
              <p className="text-sm text-slate-400">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-400">
                {reports.filter((r) => r.status === "in_progress").length}
              </p>
              <p className="text-sm text-slate-400">In Progress</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-400">
                {reports.filter((r) => r.status === "resolved").length}
              </p>
              <p className="text-sm text-slate-400">Resolved</p>
            </CardContent>
          </Card>
        </div>

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
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#f8fafc" }}
                        itemStyle={{ color: "#f8fafc" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="reports"
                        stroke="#06b6d4"
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
            <CardHeader>
              <CardTitle className="text-white">Incident Categories</CardTitle>
              <CardDescription className="text-slate-400">Distribution by bullying type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {typeData.length > 0 ? (
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
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "#f8fafc" }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">No data available</div>
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={60} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#f8fafc" }}
                        itemStyle={{ color: "#f8fafc" }}
                      />
                      <Bar dataKey="reports" fill="#06b6d4" radius={[4, 4, 0, 0]} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#f8fafc" }}
                      itemStyle={{ color: "#f8fafc" }}
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
                        fill={COLORS[index % COLORS.length]}
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
