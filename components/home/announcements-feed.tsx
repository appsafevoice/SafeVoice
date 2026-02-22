"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { AnnouncementCard } from "@/components/home/announcement-card"
import type { Announcement } from "@/lib/supabase/types"

interface AnnouncementsFeedProps {
  initialAnnouncements: Announcement[]
  fallbackAnnouncements: Announcement[]
}

export function AnnouncementsFeed({ initialAnnouncements, fallbackAnnouncements }: AnnouncementsFeedProps) {
  const supabase = createBrowserClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    initialAnnouncements.length > 0 ? initialAnnouncements : fallbackAnnouncements,
  )

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5)

    if (data && data.length > 0) {
      setAnnouncements(data)
    } else {
      setAnnouncements(fallbackAnnouncements)
    }
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
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {announcements.map((announcement) => (
        <AnnouncementCard key={announcement.id} announcement={announcement} />
      ))}
    </div>
  )
}
