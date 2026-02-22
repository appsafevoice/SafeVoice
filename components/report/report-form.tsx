"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Upload, X, CheckCircle, ArrowLeft, ImageIcon, FileVideo } from "lucide-react"
import Link from "next/link"

const bullyingTypes = [
  { value: "physical", label: "Physical Bullying" },
  { value: "verbal", label: "Verbal Bullying" },
  { value: "social", label: "Social/Relational Bullying" },
  { value: "cyber", label: "Cyberbullying" },
  { value: "sexual", label: "Sexual Harassment" },
  { value: "other", label: "Other" },
]

const incidentLocations = [
  { value: "classroom", label: "Classroom" },
  { value: "hallway", label: "Hallway" },
  { value: "cafeteria", label: "Cafeteria" },
  { value: "playground", label: "Playground" },
  { value: "restroom", label: "Restroom" },
  { value: "school_gate", label: "School Gate" },
  { value: "online", label: "Online / Social Media" },
  { value: "outside_campus", label: "Outside Campus" },
  { value: "others", label: "Others" },
]

const MAX_FILES = 10
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

interface ReportFormProps {
  userId: string
}

export function ReportForm({ userId }: ReportFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    incidentDate: "",
    bullyingType: "",
    incidentLocation: "",
    otherLocation: "",
    details: "",
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const oversizedFiles = selectedFiles.filter((file) => file.size > MAX_FILE_SIZE_BYTES)

    if (oversizedFiles.length > 0) {
      setError("Each file must be 25MB or smaller.")
      return
    }

    setError("")
    setFiles((prev) => {
      const nextFiles = [...prev, ...selectedFiles].slice(0, MAX_FILES)
      if (prev.length + selectedFiles.length > MAX_FILES) {
        setError(`You can upload up to ${MAX_FILES} files only.`)
      }
      return nextFiles
    })
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (files.length > MAX_FILES) {
      setError(`You can upload up to ${MAX_FILES} files only.`)
      return
    }

    if (files.some((file) => file.size > MAX_FILE_SIZE_BYTES)) {
      setError("Each file must be 25MB or smaller.")
      return
    }

    if (!formData.incidentLocation) {
      setError("Please select where the incident happened.")
      return
    }

    if (
      (formData.incidentLocation === "others" || formData.incidentLocation === "outside_campus") &&
      !formData.otherLocation.trim()
    ) {
      setError("Please specify where the incident happened.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const attachmentUrls: string[] = []

      // File uploads require storage bucket to be configured
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split(".").pop()
          const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("report-attachments")
            .upload(fileName, file)

          if (uploadError) {
            console.log("[v0] File upload error:", uploadError.message)
            // Continue without attachments if upload fails
          } else if (uploadData) {
            const { data: urlData } = supabase.storage.from("report-attachments").getPublicUrl(fileName)
            attachmentUrls.push(urlData.publicUrl)
          }
        }
      }

    
      const locationLabel =
        formData.incidentLocation === "others" || formData.incidentLocation === "outside_campus"
          ? formData.otherLocation.trim()
          : incidentLocations.find((location) => location.value === formData.incidentLocation)?.label ||
            formData.incidentLocation

      const reportData = {
        user_id: userId,
        incident_date: formData.incidentDate,
        bullying_type: formData.bullyingType,
        details: `Location: ${locationLabel}\n\n${formData.details}`,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        status: "pending",
      }

      console.log("Submitting report:", reportData)

      const { error: reportError } = await supabase.from("reports").insert(reportData)

      if (reportError) {
        console.log("Report error:", reportError)
        throw new Error(reportError.message || "Database error")
      }

      setSuccess(true)
    } catch (err: unknown) {
      console.log("Catch error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to submit report"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-xl border-0 shadow-lg">
          <CardContent className="p-6 sm:p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Report Submitted</h2>
            <p className="text-muted-foreground">
              Thank you for speaking up. Your report has been submitted and will be reviewed by the guidance counselor.
            </p>
            <p className="text-sm text-muted-foreground">You are not alone. We are here to help.</p>
            <Button onClick={() => router.push("/home")} className="w-full mt-4">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="flex items-center gap-4 pt-2">
          <Link href="/home" className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Report an Incident</h1>
        </header>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Incident Details</CardTitle>
            <CardDescription>
              All information is confidential and will only be shared with the guidance counselor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="incidentDate">Date of Incident *</Label>
                  <Input
                    id="incidentDate"
                    type="date"
                    value={formData.incidentDate}
                    onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                    required
                    className="bg-input"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bullyingType">Type of Bullying *</Label>
                  <Select
                    value={formData.bullyingType}
                    onValueChange={(value) => setFormData({ ...formData, bullyingType: value })}
                    required
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Select type of bullying" />
                    </SelectTrigger>
                    <SelectContent>
                      {bullyingTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incidentLocation">Where did it happen? *</Label>
                <Select
                  value={formData.incidentLocation}
                  onValueChange={(value) => setFormData({ ...formData, incidentLocation: value })}
                  required
                >
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentLocations.map((location) => (
                      <SelectItem key={location.value} value={location.value}>
                        {location.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(formData.incidentLocation === "others" || formData.incidentLocation === "outside_campus") && (
                <div className="space-y-2">
                  <Label htmlFor="otherLocation">Please specify location *</Label>
                  <Input
                    id="otherLocation"
                    type="text"
                    placeholder="Enter location"
                    value={formData.otherLocation}
                    onChange={(e) => setFormData({ ...formData, otherLocation: e.target.value })}
                    required
                    className="bg-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="details">Details of the Incident *</Label>
                <Textarea
                  id="details"
                  placeholder="Please describe what happened, where it happened, and who was involved..."
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  required
                  className="bg-input min-h-[120px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Attachments (Optional)</Label>
                <div className="space-y-2">
                  <Input
                    id="attachments"
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("attachments")?.click()}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-accent/50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload images or videos (max 10 files, 25MB each)</span>
                  </button>

                  {files.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          {file.type.startsWith("image/") ? (
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <FileVideo className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm flex-1 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1 hover:bg-background rounded"
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 sm:pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    loading ||
                    !formData.incidentDate ||
                    !formData.bullyingType ||
                    !formData.incidentLocation ||
                    ((formData.incidentLocation === "others" || formData.incidentLocation === "outside_campus") &&
                      !formData.otherLocation.trim()) ||
                    !formData.details
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By submitting this report, you confirm that the information provided is truthful to the best of your
                knowledge.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
