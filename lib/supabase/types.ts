export interface Profile {
  id: string
  lrn: string
  first_name: string
  last_name: string
  email: string
  full_name?: string
  student_id?: string
  school_id_url?: string
  is_verified?: boolean
  verified_at?: string | null
  verified_by_email?: string | null
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
  resolution_description?: string | null
  resolution_attachments?: string[] | null
  resolved_at?: string | null
  status: "pending" | "reviewed" | "in_progress" | "resolved"
  created_at: string
  updated_at: string
}

export interface ReportComment {
  id: string
  report_id: string
  author_id?: string
  author_role: "student" | "admin"
  author_name?: string | null
  author_position?: string | null
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
