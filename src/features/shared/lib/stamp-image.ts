const MAX_STAMP_EDGE_PX = 360
const JPEG_QUALITY = 0.82

/** Сжимает загруженную печать до data URL (JPEG/PNG), чтобы черновик и DOCX не раздувались. */
export async function fileToStampDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Нужен файл изображения (PNG, JPG, WebP)')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_STAMP_EDGE_PX / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas недоступен')

    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    // PNG сохраняет прозрачность печати лучше JPEG
    if (file.type === 'image/png' || file.type === 'image/webp') {
      return canvas.toDataURL('image/png')
    }
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}

export interface StampBinary {
  bytes: Uint8Array
  type: 'png' | 'jpg'
  width: number
  height: number
}

export async function dataUrlToStampBinary(dataUrl: string): Promise<StampBinary | null> {
  if (!dataUrl.startsWith('data:image/')) return null

  const match = /^data:(image\/[a-zA-Z0+.-]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null

  const mime = match[1] ?? ''
  const base64 = match[2] ?? ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  const type: 'png' | 'jpg' = mime.includes('png') ? 'png' : 'jpg'

  const dims = await readImageSize(dataUrl)
  return {
    bytes,
    type,
    width: dims.width,
    height: dims.height,
  }
}

function readImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Не удалось прочитать изображение печати'))
    img.src = dataUrl
  })
}
