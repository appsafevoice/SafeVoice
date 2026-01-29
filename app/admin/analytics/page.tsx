"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  // Status distribution
  const statusData = [
    { name: "Pending", value: reports.filter((r) => r.status === "pending" || !r.status).length },
    { name: "In Progress", value: reports.filter((r) => r.status === "in_progress").length },
    { name: "Resolved", value: reports.filter((r) => r.status === "resolved").length },
  ].filter((d) => d.value > 0)

  // Monthly trend (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const month = date.toLocaleString("en-US", { month: "short" })
    const year = date.getFullYear()
    const monthStart = new Date(year, date.getMonth(), 1)
    const monthEnd = new Date(year, date.getMonth() + 1, 0)

    const count = reports.filter((r) => {
      const reportDate = new Date(r.created_at)
      return reportDate >= monthStart && reportDate <= monthEnd
    }).length

    return { month, reports: count }
  })

  // Daily trend (last 14 days)
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (13 - i))
    const dateStr = date.toISOString().split("T")[0]
    const count = reports.filter((r) => r.created_at.split("T")[0] === dateStr).length

    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reports: count,
    }
  })

  // Type by month for stacked chart
  const typeByMonth = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const month = date.toLocaleString("en-US", { month: "short" })
    const year = date.getFullYear()
    const monthStart = new Date(year, date.getMonth(), 1)
    const monthEnd = new Date(year, date.getMonth() + 1, 0)

    const monthReports = reports.filter((r) => {
      const reportDate = new Date(r.created_at)
      return reportDate >= monthStart && reportDate <= monthEnd
    })

    const data: { [key: string]: string | number } = { month }
    const types = [...new Set(reports.map((r) => r.bullying_type).filter(Boolean))]
    types.forEach((type) => {
      data[type] = monthReports.filter((r) => r.bullying_type === type).length
    })

    return data
  })

  const allTypes = [...new Set(reports.map((r) => r.bullying_type).filter(Boolean))]

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
            <CardHeader>
              <CardTitle className="text-white">Monthly Trend</CardTitle>
              <CardDescription className="text-slate-400">Reports over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
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
            <CardHeader>
              <CardTitle className="text-white">Daily Activity</CardTitle>
              <CardDescription className="text-slate-400">Reports in the last 14 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
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
                    />
                    <Bar dataKey="reports" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Status Overview</CardTitle>
              <CardDescription className="text-slate-400">Current status of all reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#f8fafc" }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {statusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Resolved"
                                ? "#22c55e"
                                : entry.name === "In Progress"
                                  ? "#f59e0b"
                                  : "#64748b"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Type by Month Stacked Chart */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Incident Types Over Time</CardTitle>
            <CardDescription className="text-slate-400">Monthly breakdown by bullying category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {allTypes.length > 0 ? (
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
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
                    />
                    {allTypes.map((type, index) => (
                      <Bar
                        key={type}
                        dataKey={type}
                        stackId="a"
                        fill={COLORS[index % COLORS.length]}
                        radius={index === allTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
