/** Приводит значение поля формы к строке (number input / JSON могут отдать number). */
export function asTrimmedString(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}
