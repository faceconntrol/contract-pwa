import { asTrimmedString } from '@/features/shared/lib/string'
import type { LandlordType, LeaseFormState } from '../types'

const STORAGE_KEY = 'contract-pwa:landlord-history'
const MAX_ENTRIES = 30

export interface LandlordHistoryEntry {
  id: string
  label: string
  savedAt: string
  landlordType: LandlordType
  landlordFullName: string
  landlordBirthDate: string
  landlordAddress: string
  landlordGender: LeaseFormState['landlordGender']
  companyName: string
  companyInn: string
  companyOgrn: string
  companyKpp: string
  companyAddress: string
  directorPosition: string
  directorName: string
  directorNameNominative: string
  directorBasis: string
  landlordStampDataUrl: string
}

function entryLabel(entry: Omit<LandlordHistoryEntry, 'id' | 'label' | 'savedAt'>): string {
  if (entry.landlordType === 'ul') {
    const name = asTrimmedString(entry.companyName) || 'ЮЛ'
    const inn = asTrimmedString(entry.companyInn)
    return inn ? `${name} · ИНН ${inn}` : name
  }
  return asTrimmedString(entry.landlordFullName) || 'ФЛ'
}

function isSameLandlord(a: LandlordHistoryEntry, b: LandlordHistoryEntry): boolean {
  if (a.landlordType !== b.landlordType) return false
  if (a.landlordType === 'ul') {
    const innA = asTrimmedString(a.companyInn)
    const innB = asTrimmedString(b.companyInn)
    if (innA && innB) return innA === innB
    return asTrimmedString(a.companyName) === asTrimmedString(b.companyName)
  }
  return (
    asTrimmedString(a.landlordFullName).toLowerCase() ===
    asTrimmedString(b.landlordFullName).toLowerCase()
  )
}

export function loadLandlordHistory(): LandlordHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is LandlordHistoryEntry =>
        Boolean(item && typeof item === 'object' && typeof (item as LandlordHistoryEntry).id === 'string'),
    )
  } catch {
    return []
  }
}

function persist(entries: LandlordHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // квота / private mode — историю просто не пишем
  }
}

/** Сохраняет арендодателя из формы (после удачного экспорта или вручную). */
export function rememberLandlordFromForm(form: LeaseFormState): LandlordHistoryEntry | null {
  const snapshot: Omit<LandlordHistoryEntry, 'id' | 'label' | 'savedAt'> = {
    landlordType: form.landlordType,
    landlordFullName: asTrimmedString(form.landlordFullName),
    landlordBirthDate: asTrimmedString(form.landlordBirthDate),
    landlordAddress: asTrimmedString(form.landlordAddress),
    landlordGender: form.landlordGender,
    companyName: asTrimmedString(form.companyName),
    companyInn: asTrimmedString(form.companyInn),
    companyOgrn: asTrimmedString(form.companyOgrn),
    companyKpp: asTrimmedString(form.companyKpp),
    companyAddress: asTrimmedString(form.companyAddress),
    directorPosition: asTrimmedString(form.directorPosition),
    directorName: asTrimmedString(form.directorName),
    directorNameNominative: asTrimmedString(form.directorNameNominative),
    directorBasis: asTrimmedString(form.directorBasis),
    landlordStampDataUrl: asTrimmedString(form.landlordStampDataUrl),
  }

  const label = entryLabel(snapshot)
  if (form.landlordType === 'fl' && !snapshot.landlordFullName) return null
  if (form.landlordType === 'ul' && !snapshot.companyName && !snapshot.companyInn) return null

  const entry: LandlordHistoryEntry = {
    id: crypto.randomUUID(),
    label,
    savedAt: new Date().toISOString(),
    ...snapshot,
  }

  const existing = loadLandlordHistory()
  const withoutDup = existing.filter((item) => !isSameLandlord(item, entry))
  persist([entry, ...withoutDup])
  return entry
}

export function applyLandlordHistoryToForm(
  form: LeaseFormState,
  entry: LandlordHistoryEntry,
): void {
  form.landlordType = entry.landlordType
  form.landlordFullName = entry.landlordFullName
  form.landlordBirthDate = entry.landlordBirthDate
  form.landlordAddress = entry.landlordAddress
  form.landlordGender = entry.landlordGender || 'auto'
  form.companyName = entry.companyName
  form.companyInn = entry.companyInn
  form.companyOgrn = entry.companyOgrn
  form.companyKpp = entry.companyKpp
  form.companyAddress = entry.companyAddress
  form.directorPosition = entry.directorPosition || 'генерального директора'
  form.directorName = entry.directorName
  form.directorNameNominative = entry.directorNameNominative
  form.directorBasis = entry.directorBasis || 'Устава'
  form.landlordStampDataUrl = entry.landlordStampDataUrl
}
