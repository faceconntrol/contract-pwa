import petrovich from 'petrovich'
import { asTrimmedString } from './string'

export type PersonGender = 'male' | 'female'

/** «Шульга Иван Викторович» → «Шульга И.В.» */
export function toShortFullName(fullName: unknown): string {
  const parts = asTrimmedString(fullName).split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0] ?? ''
  const surname = parts[0] ?? ''
  const initials = parts
    .slice(1)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join('')
  return `${surname} ${initials}`
}

/** Определяет пол по отчеству (…ич / …на); без отчества — male. */
export function detectGenderFromFullName(fullName: unknown): PersonGender {
  const parts = asTrimmedString(fullName).split(/\s+/).filter(Boolean)
  const middle = parts[2]
  if (!middle) return 'male'
  try {
    const detected = petrovich.detect_gender(middle)
    return detected === 'female' ? 'female' : 'male'
  } catch {
    const lower = middle.toLowerCase()
    if (lower.endsWith('вна') || lower.endsWith('чна') || lower.endsWith('кызы')) return 'female'
    return 'male'
  }
}

/**
 * ФИО в именительном → родительный падеж (для «в лице …»).
 * «Хучбаров Исмаил Уматгериевич» → «Хучбарова Исмаила Уматгериевича»
 */
export function toGenitiveFullName(
  fullName: unknown,
  genderHint?: PersonGender | 'auto',
): string {
  const parts = asTrimmedString(fullName).split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''

  const [last = '', first = '', middle = ''] = parts
  const gender =
    genderHint === 'male' || genderHint === 'female'
      ? genderHint
      : detectGenderFromFullName(fullName)

  const person: { last: string; first?: string; middle?: string; gender: PersonGender } = {
    last,
    gender,
  }
  if (first) person.first = first
  if (middle) person.middle = middle

  try {
    const declined = petrovich(person, 'genitive')
    return [declined.last, declined.first, declined.middle].filter(Boolean).join(' ')
  } catch {
    // Без отчества petrovich не всегда определяет пол — оставляем как есть
    return parts.join(' ')
  }
}
