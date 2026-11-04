import { asTrimmedString } from './string'

export interface CompanyLookupResult {
  companyName: string
  inn: string
  ogrn: string
  kpp: string
  region: string
  directorName: string
  directorPosition: string
}

/**
 * htmlweb.ru отдаёт CORS и доступен с телефона.
 * Прямой egrul.nalog.ru из браузера блокируется CORS; Cloudflare-прокси до ФНС не достучаться (522).
 */
const HTMLWEB_ORG_URL = 'https://htmlweb.ru/json/service/org'

interface HtmlwebOrgResponse {
  status?: string | number
  error?: string
  inn?: string | number
  name?: string
  full_name?: string
  ogrn?: string | number
  kpp?: string | number
  address?: string
  seo_name?: string
  seo_post?: string
  limit?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** Приводит должность из номинатива API к формулировке «в лице …» (род. падеж). */
function positionToGenitive(raw: string): string {
  const title = asTrimmedString(raw).toLowerCase()
  if (!title) return 'генерального директора'
  if (title.includes('генеральн') && title.includes('директор')) {
    return 'генерального директора'
  }
  if (title.includes('директор')) return 'директора'
  if (title.includes('президент') && title.includes('председател')) {
    return 'президента, председателя правления'
  }
  if (title.includes('президент')) return 'президента'
  if (title.includes('председател')) return 'председателя'
  return title
}

function mapHtmlwebOrg(data: HtmlwebOrgResponse, fallbackInn: string): CompanyLookupResult {
  const companyName = asTrimmedString(data.full_name || data.name)
  if (!companyName) {
    throw new Error('Организация по ИНН не найдена')
  }

  return {
    companyName,
    inn: asTrimmedString(String(data.inn ?? '')) || fallbackInn,
    ogrn: asTrimmedString(String(data.ogrn ?? '')),
    kpp: asTrimmedString(String(data.kpp ?? '')),
    region: asTrimmedString(data.address),
    directorName: asTrimmedString(data.seo_name),
    directorPosition: positionToGenitive(data.seo_post ?? ''),
  }
}

/** Поиск организации / ИП по ИНН (нужен интернет). */
export async function lookupCompanyByInn(innRaw: string): Promise<CompanyLookupResult> {
  const inn = asTrimmedString(innRaw).replace(/\D/g, '')
  if (inn.length !== 10 && inn.length !== 12) {
    throw new Error('ИНН должен содержать 10 или 12 цифр')
  }

  const url = `${HTMLWEB_ORG_URL}?inn=${encodeURIComponent(inn)}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new Error(
      'Нет доступа к сервису проверки ИНН. Проверьте интернет и попробуйте ещё раз, либо заполните реквизиты вручную.',
    )
  }

  if (!response.ok) {
    throw new Error(`Сервис проверки ИНН недоступен (${response.status})`)
  }

  let data: HtmlwebOrgResponse
  try {
    data = (await response.json()) as HtmlwebOrgResponse
  } catch {
    throw new Error('Сервис проверки ИНН вернул некорректный ответ')
  }

  if (typeof data.status === 'number' && data.status >= 400) {
    throw new Error(asTrimmedString(data.error) || 'Организация по ИНН не найдена')
  }
  if (asTrimmedString(data.error)) {
    throw new Error(asTrimmedString(data.error))
  }

  // Иногда API отвечает с задержкой индексации — один повтор
  if (!asTrimmedString(data.full_name || data.name)) {
    await sleep(500)
    const retry = await fetch(url, { headers: { Accept: 'application/json' } })
    if (retry.ok) {
      data = (await retry.json()) as HtmlwebOrgResponse
    }
  }

  return mapHtmlwebOrg(data, inn)
}
