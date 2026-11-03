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

interface EgrulSearchResponse {
  t?: string
  captchaRequired?: boolean
}

interface EgrulRow {
  c?: string
  n?: string
  g?: string
  i?: string
  o?: string
  p?: string
  rn?: string
  k?: string
}

interface EgrulResultResponse {
  rows?: EgrulRow[]
}

const EGRUL_ORIGIN = import.meta.env.DEV ? '/api/egrul' : 'https://egrul.nalog.ru'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function parseDirector(raw: string): { position: string; name: string } {
  const value = asTrimmedString(raw)
  if (!value) return { position: 'генерального директора', name: '' }

  const [titlePart, ...nameParts] = value.split(':')
  const name = asTrimmedString(nameParts.join(':'))
  const title = asTrimmedString(titlePart).toLowerCase()

  let position = 'генерального директора'
  if (title.includes('генеральн') && title.includes('директор')) {
    position = 'генерального директора'
  } else if (title.includes('директор')) {
    position = 'директора'
  } else if (title.includes('президент')) {
    position = 'президента'
  } else if (title) {
    position = title
  }

  return { position, name }
}

async function postSearch(inn: string): Promise<string> {
  const body = new URLSearchParams({
    query: inn,
    vyp3CaptchaToken: '',
    page: '',
    nameEq: '',
    region: '',
    PreventChromeAutocomplete: '',
  })

  const response = await fetch(`${EGRUL_ORIGIN}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'application/json, text/javascript, */*; q=0.01',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`ЕГРЮЛ недоступен (${response.status})`)
  }

  const data = (await response.json()) as EgrulSearchResponse
  if (data.captchaRequired) {
    throw new Error('ЕГРЮЛ запросил капчу — заполните данные вручную')
  }
  if (!data.t) {
    throw new Error('Не удалось начать поиск по ИНН')
  }
  return data.t
}

async function fetchSearchResult(token: string): Promise<EgrulRow> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (attempt > 0) await sleep(700)
    const response = await fetch(`${EGRUL_ORIGIN}/search-result/${token}`, {
      headers: { Accept: 'application/json, text/javascript, */*; q=0.01' },
    })
    if (!response.ok) continue
    const data = (await response.json()) as EgrulResultResponse
    const row = data.rows?.[0]
    if (row) return row
  }
  throw new Error('Организация по ИНН не найдена')
}

/** Поиск организации / ИП в ЕГРЮЛ ФНС по ИНН (нужен интернет; в dev — через Vite proxy). */
export async function lookupCompanyByInn(innRaw: string): Promise<CompanyLookupResult> {
  const inn = asTrimmedString(innRaw).replace(/\D/g, '')
  if (inn.length !== 10 && inn.length !== 12) {
    throw new Error('ИНН должен содержать 10 или 12 цифр')
  }

  const token = await postSearch(inn)
  const row = await fetchSearchResult(token)
  const director = parseDirector(row.g ?? '')

  return {
    companyName: asTrimmedString(row.c || row.n),
    inn: asTrimmedString(row.i) || inn,
    ogrn: asTrimmedString(row.o),
    kpp: asTrimmedString(row.p),
    region: asTrimmedString(row.rn),
    directorName: director.name,
    directorPosition: director.position,
  }
}
