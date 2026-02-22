"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Quote, Bell, Megaphone, Heart } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Announcement } from "@/lib/supabase/types"

interface AnnouncementCardProps {
  announcement: Announcement
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const supabase = createBrowserClient()
  const [likesCount, setLikesCount] = useState(0)
  const [likedByMe, setLikedByMe] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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

  const isPersistedAnnouncement = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    announcement.id,
  )

  useEffect(() => {
    const loadLikes = async () => {
      if (!isPersistedAnnouncement) {
        setLikesCount(0)
        setLikedByMe(false)
        setCurrentUserId(null)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const userId = user?.id || null
      setCurrentUserId(userId)

      const { count } = await supabase
        .from("announcement_likes")
        .select("*", { count: "exact", head: true })
        .eq("announcement_id", announcement.id)

      setLikesCount(count || 0)

      if (userId) {
        const { data } = await supabase
          .from("announcement_likes")
          .select("id")
          .eq("announcement_id", announcement.id)
          .eq("user_id", userId)
          .maybeSingle()
        setLikedByMe(Boolean(data))
      } else {
        setLikedByMe(false)
      }
    }

    loadLikes()
  }, [announcement.id, isPersistedAnnouncement, supabase])

  const handleToggleLike = async () => {
    if (!isPersistedAnnouncement) return
    if (!currentUserId || isLiking) return
    setIsLiking(true)

    if (likedByMe) {
      const { error } = await supabase
        .from("announcement_likes")
        .delete()
        .eq("announcement_id", announcement.id)
        .eq("user_id", currentUserId)

      if (!error) {
        setLikedByMe(false)
        setLikesCount((prev) => Math.max(0, prev - 1))
      }
    } else {
      const { error } = await supabase.from("announcement_likes").insert({
        announcement_id: announcement.id,
        user_id: currentUserId,
      })

      if (!error) {
        setLikedByMe(true)
        setLikesCount((prev) => prev + 1)
      }
    }

    setIsLiking(false)
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
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`p-2 rounded-lg shrink-0 ${bgColors[announcement.type]}`}>
            <Icon className={`w-5 h-5 ${iconColors[announcement.type]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">{announcement.title}</h3>
            {announcement.content && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{announcement.content}</p>
            )}
            <div className="mt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleToggleLike}
                disabled={!isPersistedAnnouncement || !currentUserId || isLiking}
                className="h-8 px-2.5 text-muted-foreground hover:text-foreground"
              >
                <Heart className={`w-4 h-4 mr-1 ${likedByMe ? "fill-red-500 text-red-500" : ""}`} />
                <span className="text-xs">{likesCount}</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
