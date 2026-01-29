import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react"
import type { Report } from "@/lib/supabase/types"

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
  if (reports.length === 0) {
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
        <CardTitle className="text-lg">Recent Reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.map((report) => {
          const status = statusConfig[report.status as keyof typeof statusConfig] || statusConfig.pending
          const StatusIcon = status.icon

          return (
            <div key={report.id} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {bullyingTypeLabels[report.bullying_type] || report.bullying_type}
                    </span>
                    <Badge variant={status.variant} className="text-xs">
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
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
