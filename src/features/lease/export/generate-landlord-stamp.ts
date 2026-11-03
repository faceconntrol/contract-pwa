import { asTrimmedString } from '@/features/shared/lib/string'
import { toShortFullName } from '@/features/shared/lib/name'
import type { LeaseFormState } from '../types'

const STAMP_SIZE = 640

/** Оттенок синей штемпельной краски. */
const INK = {
  r: 28,
  g: 72,
  b: 168,
}

/** Расшифровки организационно-правовых форм для текста по кругу. */
const LEGAL_FORM_EXPANSIONS: Array<{ pattern: RegExp; full: string }> = [
  {
    pattern: /^\s*ООО\b/i,
    full: 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ',
  },
  {
    pattern: /^\s*ПАО\b/i,
    full: 'ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО',
  },
  {
    pattern: /^\s*НАО\b/i,
    full: 'НЕПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО',
  },
  {
    pattern: /^\s*АО\b/i,
    full: 'АКЦИОНЕРНОЕ ОБЩЕСТВО',
  },
  {
    pattern: /^\s*ЗАО\b/i,
    full: 'ЗАКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО',
  },
  {
    pattern: /^\s*ОАО\b/i,
    full: 'ОТКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО',
  },
  {
    pattern: /^\s*ИП\b/i,
    full: 'ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ',
  },
  {
    pattern: /^\s*ГУП\b/i,
    full: 'ГОСУДАРСТВЕННОЕ УНИТАРНОЕ ПРЕДПРИЯТИЕ',
  },
  {
    pattern: /^\s*МУП\b/i,
    full: 'МУНИЦИПАЛЬНОЕ УНИТАРНОЕ ПРЕДПРИЯТИЕ',
  },
  {
    pattern: /^\s*ПК\b/i,
    full: 'ПРОИЗВОДСТВЕННЫЙ КООПЕРАТИВ',
  },
  {
    pattern: /^\s*НКО\b/i,
    full: 'НЕКОММЕРЧЕСКАЯ ОРГАНИЗАЦИЯ',
  },
]

export interface LandlordStampInput {
  landlordType: LeaseFormState['landlordType']
  companyName: string
  companyInn: string
  companyOgrn: string
  companyAddress: string
  landlordFullName: string
  landlordAddress: string
}

/** Круглая «живая» печать арендодателя (синяя, с текстурой чернил). */
export function generateLandlordStampDataUrl(input: LandlordStampInput): string | null {
  const prepared = prepareStampText(input)
  if (!prepared) return null

  const canvas = document.createElement('canvas')
  canvas.width = STAMP_SIZE
  canvas.height = STAMP_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const seed = hashSeed(
    `${input.landlordType}|${prepared.arcText}|${prepared.centerName}|${prepared.ogrn}|${prepared.inn}`,
  )
  const rnd = mulberry32(seed)

  ctx.clearRect(0, 0, STAMP_SIZE, STAMP_SIZE)

  const tilt = (rnd() - 0.5) * 0.08
  ctx.save()
  ctx.translate(STAMP_SIZE / 2, STAMP_SIZE / 2)
  ctx.rotate(tilt)
  ctx.translate(-STAMP_SIZE / 2, -STAMP_SIZE / 2)

  const cx = STAMP_SIZE / 2 + (rnd() - 0.5) * 6
  const cy = STAMP_SIZE / 2 + (rnd() - 0.5) * 6
  const outerR = STAMP_SIZE * (0.445 + rnd() * 0.012)
  const midR = outerR * 0.88
  const innerR = outerR * 0.62

  strokeWobblyCircle(ctx, cx, cy, outerR, 7 + rnd() * 2, rnd, 0.9)
  strokeWobblyCircle(ctx, cx, cy, midR, 2.2 + rnd(), rnd, 0.55)
  strokeWobblyCircle(ctx, cx, cy, innerR, 3.5 + rnd(), rnd, 0.75)

  // Полная расшифровка формы — по всему кругу (верх + низ)
  drawCircleLegend(ctx, prepared.arcText, cx, cy, outerR * 0.78, rnd)

  // Центр: ОГРН → название → ИНН
  drawCenterBlock(ctx, prepared, cx, cy, innerR, rnd)

  ctx.restore()
  applyInkTexture(ctx, rnd)

  return canvas.toDataURL('image/png')
}

export function stampInputFromLeaseForm(form: LeaseFormState): LandlordStampInput {
  return {
    landlordType: form.landlordType,
    companyName: asTrimmedString(form.companyName),
    companyInn: asTrimmedString(form.companyInn),
    companyOgrn: asTrimmedString(form.companyOgrn),
    companyAddress: asTrimmedString(form.companyAddress),
    landlordFullName: asTrimmedString(form.landlordFullName),
    landlordAddress: asTrimmedString(form.landlordAddress),
  }
}

function prepareStampText(input: LandlordStampInput): {
  arcText: string
  centerName: string
  ogrn: string
  inn: string
} | null {
  if (input.landlordType === 'ul') {
    if (!input.companyName && !input.companyInn) return null
    const parsed = parseCompanyName(input.companyName)
    return {
      arcText: parsed.formFull,
      centerName: (parsed.tradeName || input.companyName || 'ОРГАНИЗАЦИЯ').toUpperCase(),
      ogrn: input.companyOgrn ? `ОГРН ${input.companyOgrn}` : '',
      inn: input.companyInn ? `ИНН ${input.companyInn}` : '',
    }
  }

  const fullName = input.landlordFullName
  if (!fullName) return null
  return {
    arcText: 'ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ',
    centerName: (toShortFullName(fullName) || fullName).toUpperCase(),
    ogrn: '',
    inn: 'М.П.',
  }
}

function parseCompanyName(rawName: string): { formFull: string; tradeName: string } {
  const raw = asTrimmedString(rawName)
  if (!raw) {
    return { formFull: 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ', tradeName: '' }
  }

  for (const item of LEGAL_FORM_EXPANSIONS) {
    if (!item.pattern.test(raw)) continue
    const withoutForm = raw.replace(item.pattern, '').trim()
    const tradeName = stripQuotes(withoutForm)
    return { formFull: item.full, tradeName }
  }

  // Уже полная формулировка в начале
  const fullMatch = raw.match(
    /^(общество с ограниченной ответственностью|акционерное общество|публичное акционерное общество)\s*/i,
  )
  if (fullMatch) {
    return {
      formFull: fullMatch[1]!.toUpperCase(),
      tradeName: stripQuotes(raw.slice(fullMatch[0].length)),
    }
  }

  return {
    formFull: 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ',
    tradeName: stripQuotes(raw),
  }
}

function stripQuotes(value: string): string {
  return asTrimmedString(value).replace(/^["«„]\s*|\s*["»“]$/g, '')
}

function ink(alpha: number): string {
  return `rgba(${INK.r}, ${INK.g}, ${INK.b}, ${alpha})`
}

function strokeWobblyCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  lineWidth: number,
  rnd: () => number,
  alpha: number,
): void {
  ctx.save()
  ctx.strokeStyle = ink(alpha)
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  const steps = 120
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2
    const jitter = 1 + (rnd() - 0.5) * 0.018
    const r = radius * jitter
    const x = cx + Math.cos(t) * r
    const y = cy + Math.sin(t) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.globalAlpha = alpha
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.strokeStyle = ink(alpha * 0.35)
  ctx.lineWidth = lineWidth * 1.35
  ctx.beginPath()
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2
    const jitter = 1 + (rnd() - 0.5) * 0.022
    const r = radius * jitter
    const x = cx + Math.cos(t) * r + (rnd() - 0.5) * 1.2
    const y = cy + Math.sin(t) * r + (rnd() - 0.5) * 1.2
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

/** Текст организационно-правовой формы равномерно по всей окружности. */
function drawCircleLegend(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  rnd: () => number,
): void {
  const value = asTrimmedString(text).toUpperCase()
  if (!value) return

  // Разделители ★ между повтором, если строка короткая для полного круга
  let legend = value
  ctx.save()
  ctx.font = 'bold 20px "Times New Roman", "Liberation Serif", serif'
  const minCircleLen = radius * Math.PI * 1.55
  while (ctx.measureText(legend).width < minCircleLen) {
    legend = `${legend}  •  ${value}`
    if (legend.length > 180) break
  }

  const chars = legend.split('')
  const totalWidth = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0)
  const angleSpan = Math.min(Math.PI * 2 * 0.98, totalWidth / radius)
  let angle = -Math.PI / 2 - angleSpan / 2

  ctx.fillStyle = ink(0.88)
  for (const ch of chars) {
    const w = ctx.measureText(ch).width
    const charAngle = (w * (0.98 + rnd() * 0.05)) / radius
    const mid = angle + charAngle / 2
    const localR = radius * (1 + (rnd() - 0.5) * 0.01)
    ctx.save()
    ctx.translate(cx + Math.cos(mid) * localR, cy + Math.sin(mid) * localR)
    ctx.rotate(mid + Math.PI / 2 + (rnd() - 0.5) * 0.03)
    ctx.globalAlpha = 0.72 + rnd() * 0.28
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(ch, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.6)
    ctx.restore()
    angle += charAngle
  }
  ctx.restore()
}

function drawCenterBlock(
  ctx: CanvasRenderingContext2D,
  prepared: { centerName: string; ogrn: string; inn: string },
  cx: number,
  cy: number,
  innerR: number,
  rnd: () => number,
): void {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const maxWidth = innerR * 1.7

  // ОГРН сверху
  if (prepared.ogrn) {
    ctx.font = '20px "Times New Roman", "Liberation Serif", serif'
    ctx.fillStyle = ink(0.82 + rnd() * 0.15)
    ctx.globalAlpha = 0.9
    ctx.fillText(prepared.ogrn, cx, cy - 52, maxWidth)
  }

  // Название компании по центру (с переносом при необходимости)
  const nameLines = wrapCenterName(ctx, prepared.centerName, maxWidth)
  ctx.font = 'bold 26px "Times New Roman", "Liberation Serif", serif'
  ctx.fillStyle = ink(0.9)
  const nameBlockHeight = (nameLines.length - 1) * 28
  const nameStart = cy - nameBlockHeight / 2
  nameLines.forEach((line, index) => {
    ctx.globalAlpha = 0.88 + rnd() * 0.12
    ctx.fillText(line, cx + (rnd() - 0.5) * 1.5, nameStart + index * 28, maxWidth)
  })

  // ИНН снизу
  if (prepared.inn) {
    ctx.font = '20px "Times New Roman", "Liberation Serif", serif'
    ctx.fillStyle = ink(0.82 + rnd() * 0.15)
    ctx.globalAlpha = 0.9
    ctx.fillText(prepared.inn, cx, cy + 52, maxWidth)
  }

  ctx.restore()
}

function wrapCenterName(
  ctx: CanvasRenderingContext2D,
  name: string,
  maxWidth: number,
): string[] {
  ctx.font = 'bold 26px "Times New Roman", "Liberation Serif", serif'
  const words = asTrimmedString(name).split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = words[0] ?? ''
  for (let i = 1; i < words.length; i += 1) {
    const word = words[i] ?? ''
    const trial = `${current} ${word}`
    if (ctx.measureText(trial).width <= maxWidth) {
      current = trial
    } else {
      lines.push(current)
      current = word
    }
  }
  lines.push(current)
  return lines.slice(0, 3)
}

function applyInkTexture(ctx: CanvasRenderingContext2D, rnd: () => number): void {
  const { width, height } = ctx.canvas
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0
    if (a < 8) continue
    const noise = 0.75 + rnd() * 0.45
    const hole = rnd() < 0.012 ? 0.15 + rnd() * 0.35 : 1
    data[i] = INK.r
    data[i + 1] = INK.g
    data[i + 2] = INK.b
    data[i + 3] = Math.max(0, Math.min(255, a * noise * hole))
  }

  ctx.putImageData(image, 0, 0)

  ctx.save()
  for (let i = 0; i < 18; i += 1) {
    const angle = rnd() * Math.PI * 2
    const dist = width * (0.28 + rnd() * 0.18)
    const x = width / 2 + Math.cos(angle) * dist
    const y = height / 2 + Math.sin(angle) * dist
    const radius = 4 + rnd() * 14
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, ink(0.12 + rnd() * 0.12))
    gradient.addColorStop(1, ink(0))
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function hashSeed(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
