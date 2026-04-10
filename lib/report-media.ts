export const REPORT_ATTACHMENTS_BUCKET = "report-attachments"
export const REPORT_MAX_FILES = 10
export const REPORT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

type AttachmentKind = "image" | "video" | "audio" | "other"

const IMAGE_FILE_PATTERN = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i
const VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg|mov|m4v)$/i
const AUDIO_FILE_PATTERN = /\.(mp3|wav|m4a|aac|oga|ogg|opus|webm)$/i

export function getAttachmentKind(source: string, mimeType?: string | null): AttachmentKind {
  const normalizedMimeType = (mimeType || "").toLowerCase()
  const normalizedSource = source.split("?")[0].toLowerCase()

  if (normalizedMimeType.startsWith("image/") || IMAGE_FILE_PATTERN.test(normalizedSource)) {
    return "image"
  }

  if (normalizedMimeType.startsWith("video/") || VIDEO_FILE_PATTERN.test(normalizedSource)) {
    return "video"
  }

  if (normalizedMimeType.startsWith("audio/") || AUDIO_FILE_PATTERN.test(normalizedSource)) {
    return "audio"
  }

  return "other"
}

export function isImageAttachment(source: string, mimeType?: string | null) {
  return getAttachmentKind(source, mimeType) === "image"
}

export function isVideoAttachment(source: string, mimeType?: string | null) {
  return getAttachmentKind(source, mimeType) === "video"
}

export function isAudioAttachment(source: string, mimeType?: string | null) {
  return getAttachmentKind(source, mimeType) === "audio"
}

export function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim() || "attachment"
  const extension = trimmed.includes(".") ? `.${trimmed.split(".").pop()}` : ""
  const baseName = extension ? trimmed.slice(0, -extension.length) : trimmed
  const normalizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  const safeBaseName = normalizedBaseName || "attachment"
  const safeExtension = extension.replace(/[^.a-zA-Z0-9]+/g, "")

  return `${safeBaseName}${safeExtension}`
}
