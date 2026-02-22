"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react"
import type { Report } from "@/lib/supabase/types"
import { ReportCommentsThread } from "@/components/report/report-comments-thread"
import { createBrowserClient } from "@/lib/supabase/client"

interface RecentReportsProps {
  reports: Report[]
}

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
  },
  reviewed: {
    label: "Reviewed",
    variant: "default" as const,
    icon: AlertCircle,
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    icon: AlertCircle,
  },
  resolved: {
    label: "Resolved",
    variant: "outline" as const,
    icon: CheckCircle,
  },
}

const bullyingTypeLabels: Record<string, string> = {
  physical: "Physical",
  verbal: "Verbal",
  social: "Social",
  cyber: "Cyber",
  sexual: "Sexual",
  other: "Other",
}

export function RecentReports({ reports }: RecentReportsProps) {
  const supabase = createBrowserClient()
  const [localReports, setLocalReports] = useState<Report[]>(reports)
  const [openCommentsByReport, setOpenCommentsByReport] = useState<Record<string, boolean>>({})

  const toggleComments = (reportId: string) => {
    setOpenCommentsByReport((prev) => ({ ...prev, [reportId]: !prev[reportId] }))
  }

  useEffect(() => {
    setLocalReports(reports)
  }, [reports])

  useEffect(() => {
    const reportIds = reports.map((report) => report.id)
    if (reportIds.length === 0) return

    const channel = supabase
      .channel("student-reports-status-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reports" }, (payload) => {
        const updatedReport = payload.new as Report
        if (!reportIds.includes(updatedReport.id)) return
        setLocalReports((prev) => prev.map((report) => (report.id === updatedReport.id ? { ...report, ...updatedReport } : report)))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [reports, supabase])

  if (localReports.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No reports submitted yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg sm:text-xl">Recent Reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {localReports.map((report) => {
          const status = statusConfig[report.status as keyof typeof statusConfig] || statusConfig.pending
          const StatusIcon = status.icon

          return (
            <div key={report.id} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {bullyingTypeLabels[report.bullying_type] || report.bullying_type}
                    </span>
                    <Badge variant={status.variant} className="text-xs whitespace-nowrap">
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(report.incident_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{report.details}</p>
                  <div className="mt-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => toggleComments(report.id)}>
                      {openCommentsByReport[report.id] ? "Hide Comments" : "View Comments"}
                    </Button>
                  </div>
                  {openCommentsByReport[report.id] && (
                    <ReportCommentsThread reportId={report.id} authorRole="student" className="mt-3" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
