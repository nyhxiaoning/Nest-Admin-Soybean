import dayjs from "dayjs"

export function formatTime(value?: number) {
  if (!value) return "--"
  return dayjs(value).format("YYYY-MM-DD HH:mm")
}

export function formatDateTime(value?: number) {
  if (!value) return "--"
  return dayjs(value).format("YYYY-MM-DD HH:mm:ss")
}

export function formatDate(value?: number) {
  if (!value) return "--"
  return dayjs(value).format("YYYY-MM-DD")
}

export function maskPhone(value?: string) {
  if (!value) return "--"
  if (value.includes("*")) return value
  return value.replace(/^(\d{3})\d{4}(\d+)/, "$1****$2")
}

export function downloadUrl(url?: string) {
  if (!url) return ""
  return url
}
