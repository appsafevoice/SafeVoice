"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@/lib/supabase/client"
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

const COLORS = ["#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6", "#22c55e"]

export default function AdminDashboardPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
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
  const bullyingTypeData = reports.reduce((acc: { name: string; value: number }[], report) => {
    const existing = acc.find((item) => item.name === report.bullying_type)
    if (existing) {
      existing.value++
    } else {
      acc.push({ name: report.bullying_type || "Unknown", value: 1 })
    }
    return acc
  }, [])

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
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
      href: "/admin/reports",
    },
    {
      title: "Pending Review",
      value: reports.filter((r) => r.status === "pending").length,
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      href: "/admin/reports?status=pending",
    },
    {
      title: "Resolved Cases",
      value: reports.filter((r) => r.status === "resolved").length,
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      href: "/admin/reports?status=resolved",
    },
    {
      title: "Active Post",
      value: announcements.filter((a) => a.is_active).length,
      icon: Megaphone,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      href: "/admin/content",
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-slate-400">Monitor bullying reports and manage counselor communications</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link key={stat.title} href={stat.href} className="block">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-colors cursor-pointer">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
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
                    <Line
                      type="monotone"
                      dataKey="reports"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ fill: "#06b6d4" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bullying Type Distribution */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Bullying Type Distribution</CardTitle>
              <CardDescription className="text-slate-400">Breakdown by incident category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {bullyingTypeData.length > 0 ? (
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
                        label={({ name, percent }) =>
                          `${name} ${Number.isFinite(percent) ? (percent * 100).toFixed(0) : 0}%`
                        }
                        labelLine={false}
                      >
                        {bullyingTypeData.map((_, index) => (
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
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">No data available</div>
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
                      {report.status || "pending"}
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
