"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { AnnouncementCard } from "@/components/home/announcement-card"
import type { Announcement } from "@/lib/supabase/types"

interface AnnouncementsFeedProps {
  initialAnnouncements: Announcement[]
  fallbackAnnouncements: Announcement[]
}

const MAX_ANNOUNCEMENTS = 5

function mergeAnnouncements(liveAnnouncements: Announcement[], fallbackAnnouncements: Announcement[]) {
  const fallbackIds = new Set(fallbackAnnouncements.map((announcement) => announcement.id))
  const visibleLiveAnnouncements = liveAnnouncements.filter((announcement) => !fallbackIds.has(announcement.id))

  // Keep the default reminder cards pinned after live content.
  return [...visibleLiveAnnouncements, ...fallbackAnnouncements]
}

export function AnnouncementsFeed({ initialAnnouncements, fallbackAnnouncements }: AnnouncementsFeedProps) {
  const supabase = createBrowserClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    mergeAnnouncements(initialAnnouncements, fallbackAnnouncements),
  )

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(MAX_ANNOUNCEMENTS)

    setAnnouncements(mergeAnnouncements(data || [], fallbackAnnouncements))
  }

  useEffect(() => {
    fetchAnnouncements()

    const channel = supabase
      .channel("home-announcements-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, fetchAnnouncements)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcement_likes" }, fetchAnnouncements)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="grid grid-cols-1 gap-3">
      {announcements.map((announcement) => (
        <AnnouncementCard key={announcement.id} announcement={announcement} />
      ))}
    </div>
  )
}
