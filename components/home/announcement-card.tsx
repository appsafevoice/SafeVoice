import { Card, CardContent } from "@/components/ui/card"
import { Quote, Bell, Megaphone } from "lucide-react"
import type { Announcement } from "@/lib/supabase/types"

interface AnnouncementCardProps {
  announcement: Announcement
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const icons = {
    quote: Quote,
    reminder: Bell,
    announcement: Megaphone,
  }

  const Icon = icons[announcement.type]

  const bgColors = {
    quote: "bg-primary/10",
    reminder: "bg-amber-500/10",
    announcement: "bg-green-500/10",
  }

  const iconColors = {
    quote: "text-primary",
    reminder: "text-amber-500",
    announcement: "text-green-500",
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      {announcement.image_url && (
        <div className="aspect-video relative">
          <img
            src={announcement.image_url || "/placeholder.svg"}
            alt={announcement.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${bgColors[announcement.type]}`}>
            <Icon className={`w-5 h-5 ${iconColors[announcement.type]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{announcement.title}</h3>
            {announcement.content && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{announcement.content}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
