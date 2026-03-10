export function normalizeDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date()
  
  // 날짜 형식 확인 (YYYY-MM-DD)
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`)
  
  if (isNaN(d.getTime())) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }
  
  d.setHours(0, 0, 0, 0)
  return d
}

export function calculateGanttDuration(startStr: string | null | undefined, endStr: string | null | undefined): number {
  if (!startStr || !endStr) return 1
  
  const s = new Date(startStr.includes('T') ? startStr : `${startStr}T00:00:00`)
  const e = new Date(endStr.includes('T') ? endStr : `${endStr}T00:00:00`)
  
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1
  
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1)
}
