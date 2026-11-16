import { secureGetJson, secureRemove, secureSetJson } from './secure-storage'

export type DraftKey =
  | 'contract-pwa:draft:lease'
  | 'contract-pwa:draft:osgop'
  | 'contract-pwa:draft:osgop:include'
  | 'contract-pwa:draft:osgop:exclude'

export async function loadDraft<T>(key: DraftKey): Promise<T | null> {
  return secureGetJson<T>(key)
}

export async function saveDraft(
  key: DraftKey,
  value: unknown,
): Promise<{ ok: boolean; warned: boolean }> {
  return secureSetJson(key, value)
}

export async function clearDraft(key: DraftKey): Promise<void> {
  await secureRemove(key)
}
