"use client"

import React from "react"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createBrowserClient } from "@/lib/supabase/client"
import { Plus, Pencil, Trash2, Bell, Quote, Megaphone, CheckCircle, AlertCircle, Upload, X } from "lucide-react"

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  image_url: string | null
  is_active: boolean
  created_at: string
}

export default function AdminContentPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const supabase = createBrowserClient()

  // Form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [type, setType] = useState("announcement")
  const [imageUrl, setImageUrl] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false })

    if (data) setAnnouncements(data)
    setIsLoading(false)
  }

  const resetForm = () => {
    setTitle("")
    setContent("")
    setType("announcement")
    setImageUrl("")
    setImageFile(null)
    setImagePreview(null)
    setIsActive(true)
    setEditingAnnouncement(null)
  }

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement)
      setTitle(announcement.title)
      setContent(announcement.content)
      setType(announcement.type)
      setImageUrl(announcement.image_url || "")
      setImagePreview(announcement.image_url || null)
      setIsActive(announcement.is_active)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageUrl("")
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `announcements/${fileName}`

    const { error } = await supabase.storage.from("announcement-images").upload(filePath, file)

    if (error) {
      console.log("[v0] Error uploading image:", error)
      return null
    }

    const { data: urlData } = supabase.storage.from("announcement-images").getPublicUrl(filePath)
    return urlData.publicUrl
  }

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMessage("")

    let finalImageUrl = imageUrl

    // Upload new image if selected
    if (imageFile) {
      setIsUploading(true)
      const uploadedUrl = await uploadImage(imageFile)
      setIsUploading(false)
      
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl
      } else {
        setErrorMessage("Failed to upload image. Please try again.")
        setTimeout(() => setErrorMessage(""), 5000)
        setIsSaving(false)
        return
      }
    }

    const data = {
      title,
      content,
      type,
      image_url: finalImageUrl || null,
      is_active: isActive,
    }

    let error
    if (editingAnnouncement) {
      const result = await supabase.from("announcements").update(data).eq("id", editingAnnouncement.id)
      error = result.error
    } else {
      const result = await supabase.from("announcements").insert([data])
      error = result.error
    }

    if (error) {
      console.log("[v0] Error saving announcement:", error)
      setErrorMessage(error.message || "Failed to save content. Please try again.")
      setTimeout(() => setErrorMessage(""), 5000)
    } else {
      setSuccessMessage(editingAnnouncement ? "Content updated successfully!" : "Content created successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      fetchAnnouncements()
      setIsDialogOpen(false)
      resetForm()
    }

    setIsSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return

    const { error } = await supabase.from("announcements").delete().eq("id", id)

    if (!error) {
      setSuccessMessage("Content deleted successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      fetchAnnouncements()
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("announcements").update({ is_active: !currentStatus }).eq("id", id)

    if (!error) {
      fetchAnnouncements()
    }
  }

  const getTypeIcon = (contentType: string) => {
    switch (contentType) {
      case "quote":
        return Quote
      case "reminder":
        return Bell
      default:
        return Megaphone
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Content Manager</h1>
            <p className="text-slate-400">Manage announcements, quotes, and media</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingAnnouncement ? "Edit Content" : "Add New Content"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Create announcements, motivational quotes, or upload images
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="quote">Motivational Quote</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter title"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Content</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.   value)}
                    placeholder={type === "quote" ? "Enter your motivational quote..." : "Enter content details..."}
                    className="bg-slate-700/50 border-slate-600 text-white min-h-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Image (Optional)</Label>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removeImage}
                        className="absolute top-2 right-2 h-8 w-8 bg-slate-900/80 hover:bg-slate-900 text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-cyan-500/50 hover:bg-slate-700/30 transition-colors">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-400">Click to upload image</span>
                      <span className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-slate-200">Active</Label>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!title || !content || isSaving || isUploading}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                  >
                    {isUploading ? "Uploading..." : isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert className="bg-green-500/10 border-green-500/50">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Alert className="bg-red-500/10 border-red-500/50">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Content Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        ) : announcements.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No content yet. Add your first announcement!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((announcement) => {
              const TypeIcon = getTypeIcon(announcement.type)
              return (
                <Card
                  key={announcement.id}
                  className={`bg-slate-800/50 border-slate-700 ${!announcement.is_active ? "opacity-60" : ""}`}
                >
                  {announcement.image_url && (
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      <img
                        src={announcement.image_url || "/placeholder.svg"}
                        alt={announcement.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-cyan-500/20 rounded">
                          <TypeIcon className="w-4 h-4 text-cyan-400" />
                        </div>
                        <span className="text-xs text-slate-400 capitalize">{announcement.type}</span>
                      </div>
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={() => toggleActive(announcement.id, announcement.is_active)}
                      />
                    </div>
                    <CardTitle className="text-white text-lg mt-2">{announcement.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400 line-clamp-3 mb-4">{announcement.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(announcement)}
                          className="h-8 w-8 text-slate-400 hover:text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(announcement.id)}
                          className="h-8 w-8 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
