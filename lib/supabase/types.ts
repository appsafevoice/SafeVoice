export interface Profile {
  id: string
  lrn: string
  first_name: string
  last_name: string
  email: string
  school_id_url?: string
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  user_id?: string
  reporter_name?: string
  incident_date: string
  bullying_type: string
  details: string
  attachments?: string[]
  status: "pending" | "reviewed" | "in_progress" | "resolved"
  created_at: string
  updated_at: string
}

export interface ReportComment {
  id: string
  report_id: string
  author_id?: string
  author_role: "student" | "admin"
  content: string
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  content?: string
  image_url?: string
  type: "quote" | "reminder" | "announcement"
  is_active: boolean
  created_at: string
  hearts_count?: number
}
