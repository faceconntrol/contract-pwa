import { htmlDocumentToPdfBlob } from '@/features/shared/lib/html-to-pdf'
import { buildOsgopHtml } from './osgop-html'
import type { OsgopDocumentModel } from './osgop-model'

export async function buildOsgopPdf(model: OsgopDocumentModel): Promise<Blob> {
  return htmlDocumentToPdfBlob(buildOsgopHtml(model), {
    widthPx: 1123,
    orientation: 'landscape',
    marginMm: 8,
  })
}
