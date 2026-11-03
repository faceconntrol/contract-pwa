import { htmlDocumentToPdfBlob } from '@/features/shared/lib/html-to-pdf'
import { buildLeaseHtml } from './lease-html'
import type { LeaseDocumentModel } from './lease-model'

export async function buildLeasePdf(model: LeaseDocumentModel): Promise<Blob> {
  return htmlDocumentToPdfBlob(buildLeaseHtml(model), {
    widthPx: 794,
    orientation: 'portrait',
    marginMm: 12,
  })
}
