import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export interface HtmlToPdfOptions {
  /** Ширина области рендера в px (A4≈794, A4 landscape≈1123 при 96dpi). */
  widthPx: number
  orientation: 'portrait' | 'landscape'
  marginMm?: number
}

export interface KeepBand {
  top: number
  bottom: number
}

/** Селекторы блоков, которые нельзя резать посередине при нарезке canvas→PDF. */
const KEEP_SELECTOR = [
  '.pdf-keep-together',
  'h1',
  'h2',
  '.section',
  'p',
  '.meta',
  '.note',
  'table.meta',
  'table.vehicle tr',
  'table.parties tr',
  'thead',
  'tbody tr',
].join(', ')

/**
 * Рендерит полный HTML-документ в PDF через iframe + html2canvas + jsPDF.
 * Блоки из KEEP_SELECTOR / `.pdf-keep-together` по возможности не режутся между страницами.
 */
export async function htmlDocumentToPdfBlob(
  htmlDocument: string,
  options: HtmlToPdfOptions,
): Promise<Blob> {
  const marginMm = options.marginMm ?? 10
  const scale = 2
  const iframe = await mountIframe(htmlDocument, options.widthPx)

  try {
    const doc = iframe.contentDocument
    const source = doc?.body
    if (!source) {
      throw new Error('Не удалось отрисовать документ для PDF')
    }

    await waitFrames(2)
    await document.fonts?.ready.catch(() => undefined)

    const canvas = await html2canvas(source, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: options.widthPx,
      windowWidth: options.widthPx,
      scrollX: 0,
      scrollY: 0,
    })

    if (canvas.width < 10 || canvas.height < 10) {
      throw new Error('Canvas PDF пустой')
    }

    const keepBands = collectKeepBands(source, scale)

    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const contentWidth = pageWidth - marginMm * 2
    const contentHeight = pageHeight - marginMm * 2

    const imgWidth = contentWidth
    const pageCanvasHeight = (contentHeight * canvas.width) / imgWidth

    let renderedHeight = 0
    let pageIndex = 0

    while (renderedHeight < canvas.height - 0.5) {
      const remaining = canvas.height - renderedHeight
      const idealSlice = Math.min(pageCanvasHeight, remaining)
      const adjusted = adjustSliceForKeepBands(
        renderedHeight,
        idealSlice,
        pageCanvasHeight,
        canvas.height,
        keepBands,
      )
      // Целые пиксели — иначе на стыке страниц «съедается» полоска текста
      const sliceHeight = Math.max(1, Math.round(adjusted))

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sliceHeight

      const ctx = pageCanvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D недоступен')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      )

      const pageData = pageCanvas.toDataURL('image/jpeg', 0.95)
      const drawHeight = (sliceHeight * imgWidth) / canvas.width

      if (pageIndex > 0) pdf.addPage()
      pdf.addImage(pageData, 'JPEG', marginMm, marginMm, imgWidth, drawHeight)

      renderedHeight += sliceHeight
      pageIndex += 1

      if (pageIndex > 40) {
        throw new Error('Слишком много страниц PDF')
      }
    }

    const blob = pdf.output('blob')
    if (!blob || blob.size < 800) {
      throw new Error('PDF получился пустым — попробуйте ещё раз')
    }
    return blob
  } finally {
    iframe.remove()
  }
}

export function collectKeepBands(root: HTMLElement, scale: number): KeepBand[] {
  const rootRect = root.getBoundingClientRect()
  const nodes = root.querySelectorAll(KEEP_SELECTOR)
  const bands: KeepBand[] = []

  nodes.forEach((node) => {
    const el = node as HTMLElement
    // Пропускаем пустые / нулевой высоты
    if (el.offsetHeight < 2) return
    const rect = el.getBoundingClientRect()
    const top = (rect.top - rootRect.top + root.scrollTop) * scale
    const bottom = (rect.bottom - rootRect.top + root.scrollTop) * scale
    if (bottom > top + 1) bands.push({ top, bottom })
  })

  return mergeOverlappingBands(bands.sort((a, b) => a.top - b.top || a.bottom - b.bottom))
}

/** Склеивает почти совпадающие/вложенные полосы, чтобы разрез выбирался стабильнее. */
function mergeOverlappingBands(bands: KeepBand[]): KeepBand[] {
  if (bands.length === 0) return bands
  const merged: KeepBand[] = [{ ...bands[0]! }]
  for (let i = 1; i < bands.length; i += 1) {
    const current = bands[i]!
    const last = merged[merged.length - 1]!
    // Полностью вложенная полоса — оставляем внешнюю (уже last, если она шире)
    if (current.top >= last.top - 0.5 && current.bottom <= last.bottom + 0.5) {
      continue
    }
    // last вложена в current — расширяем
    if (last.top >= current.top - 0.5 && last.bottom <= current.bottom + 0.5) {
      last.top = current.top
      last.bottom = current.bottom
      continue
    }
    merged.push({ ...current })
  }
  return merged
}

function cutSplitsBand(absoluteCut: number, band: KeepBand): boolean {
  return band.top < absoluteCut - 0.5 && band.bottom > absoluteCut + 0.5
}

function isCleanCut(absoluteCut: number, bands: KeepBand[]): boolean {
  return !bands.some((band) => cutSplitsBand(absoluteCut, band))
}

/**
 * Подбирает нижнюю границу страницы так, чтобы разрез не проходил через keep-блок:
 * 1) идеальный разрез, если чистый;
 * 2) иначе — максимальный разрез у начала блока (блок уходит на след. страницу);
 * 3) иначе — дотягиваем до конца блока, если он влезает;
 * 4) иначе — вынужденный разрез (блок выше страницы).
 */
export function adjustSliceForKeepBands(
  renderedHeight: number,
  sliceHeight: number,
  pageCanvasHeight: number,
  canvasHeight: number,
  bands: KeepBand[],
): number {
  const pageLimit = Math.min(pageCanvasHeight, canvasHeight - renderedHeight)
  const idealAbs = renderedHeight + Math.min(sliceHeight, pageLimit)
  const minAbs = renderedHeight + Math.max(24, pageLimit * 0.18)
  const maxAbs = renderedHeight + pageLimit

  if (isCleanCut(idealAbs, bands)) {
    return idealAbs - renderedHeight
  }

  // Максимальная позиция ≤ ideal, где разрез чистый (обычно = top пересекаемого блока)
  let bestPullBack: number | null = null
  for (const band of bands) {
    if (!cutSplitsBand(idealAbs, band)) continue
    const candidate = band.top
    if (candidate < minAbs || candidate > idealAbs) continue
    if (!isCleanCut(candidate, bands)) continue
    if (bestPullBack === null || candidate > bestPullBack) {
      bestPullBack = candidate
    }
  }
  if (bestPullBack !== null) {
    return Math.max(1, bestPullBack - renderedHeight)
  }

  // Дотянуть страницу до конца блока, который уже начался и целиком влезает
  let bestExtend: number | null = null
  for (const band of bands) {
    if (!cutSplitsBand(idealAbs, band)) continue
    if (band.bottom > maxAbs + 0.5) continue
    if (band.top < minAbs && isCleanCut(band.bottom, bands)) {
      if (bestExtend === null || band.bottom > bestExtend) {
        bestExtend = band.bottom
      }
    }
  }
  if (bestExtend !== null) {
    return Math.max(1, Math.min(pageLimit, bestExtend - renderedHeight))
  }

  return Math.max(1, Math.min(pageLimit, idealAbs - renderedHeight))
}

async function mountIframe(htmlDocument: string, widthPx: number): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${widthPx}px`,
    'height:2000px',
    'border:0',
    'background:#ffffff',
    'opacity:1',
    'pointer-events:none',
    'z-index:-1',
  ].join(';')

  document.body.appendChild(iframe)

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Таймаут отрисовки PDF')), 10000)
    iframe.onload = () => {
      window.clearTimeout(timer)
      resolve()
    }
    iframe.onerror = () => {
      window.clearTimeout(timer)
      reject(new Error('Ошибка загрузки документа PDF'))
    }
    iframe.srcdoc = htmlDocument
  })

  const body = iframe.contentDocument?.body
  if (body) {
    const height = Math.max(body.scrollHeight, body.offsetHeight, 800)
    iframe.style.height = `${height + 40}px`
  }

  return iframe
}

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) => {
      if (left <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(() => step(left - 1))
    }
    step(count)
  })
}
