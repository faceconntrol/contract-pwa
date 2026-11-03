import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export interface HtmlToPdfOptions {
  /** Ширина области рендера в px (A4≈794, A4 landscape≈1123 при 96dpi). */
  widthPx: number
  orientation: 'portrait' | 'landscape'
  marginMm?: number
}

interface KeepBand {
  top: number
  bottom: number
}

/**
 * Рендерит полный HTML-документ в PDF через iframe + html2canvas + jsPDF.
 * Блоки с классом `.pdf-keep-together` не режутся между страницами.
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
      let sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight)
      sliceHeight = adjustSliceForKeepBands(
        renderedHeight,
        sliceHeight,
        pageCanvasHeight,
        canvas.height,
        keepBands,
      )

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = Math.max(1, Math.floor(sliceHeight))

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

      // защита от бесконечного цикла при слишком высоком keep-блоке
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

function collectKeepBands(root: HTMLElement, scale: number): KeepBand[] {
  const rootRect = root.getBoundingClientRect()
  const nodes = root.querySelectorAll('.pdf-keep-together')
  const bands: KeepBand[] = []

  nodes.forEach((node) => {
    const el = node as HTMLElement
    const rect = el.getBoundingClientRect()
    const top = (rect.top - rootRect.top + root.scrollTop) * scale
    const bottom = (rect.bottom - rootRect.top + root.scrollTop) * scale
    if (bottom > top) bands.push({ top, bottom })
  })

  return bands.sort((a, b) => a.top - b.top)
}

/**
 * Если разрез страницы проходит через keep-блок — режем до его начала,
 * чтобы весь блок (подпись + печать) ушёл на следующую страницу целиком.
 */
function adjustSliceForKeepBands(
  renderedHeight: number,
  sliceHeight: number,
  pageCanvasHeight: number,
  canvasHeight: number,
  bands: KeepBand[],
): number {
  const idealEnd = renderedHeight + sliceHeight
  const minSlice = Math.min(sliceHeight, pageCanvasHeight * 0.35)

  for (const band of bands) {
    const crosses =
      band.top < idealEnd - 1 && band.bottom > renderedHeight + 1 && band.bottom > idealEnd
    const splitsInside = band.top < idealEnd && band.bottom > idealEnd && band.top > renderedHeight

    if (!crosses && !splitsInside) continue

    // Блок начинается на этой странице, но не вмещается — переносим целиком
    if (band.top > renderedHeight + minSlice && band.top < idealEnd) {
      return Math.max(1, band.top - renderedHeight)
    }

    // Блок выше страницы (не должен) — не режем внутри: обрезаем до конца блока, если влезает
    if (band.top <= renderedHeight && band.bottom > idealEnd) {
      const room = band.bottom - renderedHeight
      if (room <= pageCanvasHeight) {
        return Math.min(room, canvasHeight - renderedHeight)
      }
    }
  }

  return sliceHeight
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
