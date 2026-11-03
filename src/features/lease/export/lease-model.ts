import { TENANT } from '@/features/shared/constants/tenant'
import { formatRuDate, formatRuLongDate } from '@/features/shared/lib/dates'
import { formatRubAmount } from '@/features/shared/lib/money'
import { toGenitiveFullName, toShortFullName } from '@/features/shared/lib/name'
import { normalizePlate } from '@/features/shared/lib/plate'
import { asTrimmedString } from '@/features/shared/lib/string'
import type { LandlordType, LeaseFormState } from '../types'
import {
  generateLandlordStampDataUrl,
  stampInputFromLeaseForm,
} from './generate-landlord-stamp'

export interface LeaseDocumentModel {
  landlordType: LandlordType
  contractNumber: string
  plate: string
  contractDate: string
  contractDateLong: string
  /** Текст преамбулы про арендодателя (до «с одной стороны»). */
  landlordPreamble: string
  landlordSignName: string
  /** Блок реквизитов арендодателя (строки). */
  landlordRequisiteLines: string[]
  /** ФЛ-поля (для совместимости / отображения). */
  landlordFullName: string
  landlordBirthDate: string
  landlordAddress: string
  vehicleMakeModel: string
  vin: string
  year: string
  color: string
  engineType: string
  sts: string
  pts: string
  rentFrom: string
  rentFromLong: string
  rentTo: string
  rentToLong: string
  dailyPrice: string
  /** Data URL печати арендодателя или пусто. */
  landlordStampDataUrl: string
  tenant: typeof TENANT
}

function buildFlPreamble(form: LeaseFormState): string {
  const name = asTrimmedString(form.landlordFullName)
  const birth = formatRuDate(asTrimmedString(form.landlordBirthDate))
  const address = asTrimmedString(form.landlordAddress)
  const birthPart = birth ? `, ${birth} года рождения` : ''
  const addressPart = address ? `, зарегистрированный по адресу ${address}` : ''
  return `Гражданин РФ ${name}${birthPart}${addressPart}, именуемый в дальнейшем «Арендодатель»`
}

function resolveDirectorGenitive(form: LeaseFormState): string {
  const nominative = asTrimmedString(form.directorNameNominative)
  if (nominative) return toGenitiveFullName(nominative)
  return asTrimmedString(form.directorName)
}

function buildUlPreamble(form: LeaseFormState): string {
  const company = asTrimmedString(form.companyName)
  const inn = asTrimmedString(form.companyInn)
  const position = asTrimmedString(form.directorPosition) || 'генерального директора'
  const director = resolveDirectorGenitive(form)
  const basis = asTrimmedString(form.directorBasis) || 'Устава'
  const innPart = inn ? `, ИНН ${inn}` : ''
  const directorPart = director ? `, в лице ${position} ${director}` : ''
  return `${company}${innPart}${directorPart}, действующий на основании ${basis}, именуемый в дальнейшем «Арендодатель»`
}

function buildFlRequisites(form: LeaseFormState): string[] {
  const lines = [asTrimmedString(form.landlordFullName)]
  const birth = formatRuDate(asTrimmedString(form.landlordBirthDate))
  if (birth) lines.push(`${birth} года рождения,`)
  const address = asTrimmedString(form.landlordAddress)
  if (address) lines.push(`зарегистрированный по адресу ${address}`)
  return lines.filter(Boolean)
}

function buildUlRequisites(form: LeaseFormState): string[] {
  const lines = [asTrimmedString(form.companyName)]
  const address = asTrimmedString(form.companyAddress)
  if (address) lines.push(`Юридический адрес ${address}`)
  const inn = asTrimmedString(form.companyInn)
  if (inn) lines.push(`ИНН ${inn}`)
  const ogrn = asTrimmedString(form.companyOgrn)
  if (ogrn) lines.push(`ОГРН ${ogrn}`)
  const kpp = asTrimmedString(form.companyKpp)
  if (kpp) lines.push(`КПП ${kpp}`)
  return lines.filter(Boolean)
}

function resolveSignName(form: LeaseFormState): string {
  if (form.landlordType === 'ul') {
    const forSign =
      asTrimmedString(form.directorNameNominative) || asTrimmedString(form.directorName)
    return toShortFullName(forSign)
  }
  return toShortFullName(form.landlordFullName)
}

export function toLeaseDocumentModel(form: LeaseFormState): LeaseDocumentModel {
  const plate = normalizePlate(asTrimmedString(form.plate))
  const isUl = form.landlordType === 'ul'

  return {
    landlordType: form.landlordType,
    contractNumber: plate,
    plate,
    contractDate: formatRuDate(asTrimmedString(form.contractDate)),
    contractDateLong: formatRuLongDate(asTrimmedString(form.contractDate)),
    landlordPreamble: isUl ? buildUlPreamble(form) : buildFlPreamble(form),
    landlordSignName: resolveSignName(form),
    landlordRequisiteLines: isUl ? buildUlRequisites(form) : buildFlRequisites(form),
    landlordFullName: asTrimmedString(form.landlordFullName),
    landlordBirthDate: formatRuDate(asTrimmedString(form.landlordBirthDate)),
    landlordAddress: asTrimmedString(form.landlordAddress),
    vehicleMakeModel: asTrimmedString(form.vehicleMakeModel),
    vin: asTrimmedString(form.vin),
    year: asTrimmedString(form.year),
    color: asTrimmedString(form.color),
    engineType: asTrimmedString(form.engineType),
    sts: asTrimmedString(form.sts),
    pts: asTrimmedString(form.pts),
    rentFrom: formatRuDate(asTrimmedString(form.rentFrom)),
    rentFromLong: formatRuLongDate(asTrimmedString(form.rentFrom)),
    rentTo: formatRuDate(asTrimmedString(form.rentTo)),
    rentToLong: formatRuLongDate(asTrimmedString(form.rentTo)),
    dailyPrice: formatOptionalRub(form.dailyPrice),
    landlordStampDataUrl: resolveLandlordStampDataUrl(form),
    tenant: TENANT,
  }
}

/** Печать только для ЮЛ: своя загруженная имеет приоритет, иначе автогенерация. Для ФЛ — пусто. */
export function resolveLandlordStampDataUrl(form: LeaseFormState): string {
  if (form.landlordType !== 'ul') return ''
  const custom = asTrimmedString(form.landlordStampDataUrl)
  if (custom) return custom
  return generateLandlordStampDataUrl(stampInputFromLeaseForm(form)) ?? ''
}

function formatOptionalRub(value: unknown): string {
  const raw = asTrimmedString(value)
  if (!raw) return ''
  const amount = Number(raw)
  if (!Number.isFinite(amount)) return raw
  return formatRubAmount(amount)
}
