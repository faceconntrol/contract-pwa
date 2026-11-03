const DRAFT_WARNING_KEY = 'contract-pwa:draft-warning-shown'

export type DraftKey =
  | 'contract-pwa:draft:lease'
  | 'contract-pwa:draft:osgop'
  | 'contract-pwa:draft:osgop:include'
  | 'contract-pwa:draft:osgop:exclude'

export function loadDraft<T>(key: DraftKey): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function saveDraft(key: DraftKey, value: unknown): { ok: boolean; warned: boolean } {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return { ok: true, warned: false }
  } catch {
    const alreadyWarned = sessionStorage.getItem(DRAFT_WARNING_KEY) === '1'
    if (!alreadyWarned) {
      sessionStorage.setItem(DRAFT_WARNING_KEY, '1')
      return { ok: false, warned: true }
    }
    return { ok: false, warned: false }
  }
}

export function clearDraft(key: DraftKey): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}