import { asTrimmedString } from './string'

export function normalizePlate(raw: unknown): string {
  return asTrimmedString(raw).toUpperCase().replace(/\s+/g, ' ')
}

/** Безопасный фрагмент имени файла из ГРЗ. */
export function plateForFilename(plate: string): string {
  const normalized = normalizePlate(plate).replace(/\s+/g, '')
  return normalized.replace(/[^\p{L}\p{N}_-]/gu, '_') || 'TS'
}
