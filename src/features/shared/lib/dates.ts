const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const

/** `YYYY-MM-DD` → `ДД.ММ.ГГГГ`; пустое значение → пустая строка */
export function formatRuDate(isoDate: string): string {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}.${month}.${year}`
}

/** `YYYY-MM-DD` → `«26» октября 2026 года`; пустое → пустая строка */
export function formatRuLongDate(isoDate: string): string {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  const monthName = MONTHS_GENITIVE[month - 1]
  if (!monthName) return isoDate
  return `«${String(day).padStart(2, '0')}» ${monthName} ${year} года`
}

/** `YYYY-MM-DD` → `YYYYMMDD` для имени файла */
export function formatFileDate(isoDate: string): string {
  if (!isoDate) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}${m}${d}`
  }
  return isoDate.replaceAll('-', '')
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime())
}

export function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
