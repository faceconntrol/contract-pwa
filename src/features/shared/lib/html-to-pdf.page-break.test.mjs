/**
 * Проверка алгоритма разреза страниц.
 * Запуск: node src/features/shared/lib/html-to-pdf.page-break.test.mjs
 */
import assert from 'node:assert/strict'

function cutSplitsBand(absoluteCut, band) {
  return band.top < absoluteCut - 0.5 && band.bottom > absoluteCut + 0.5
}

function isCleanCut(absoluteCut, bands) {
  return !bands.some((band) => cutSplitsBand(absoluteCut, band))
}

function adjustSliceForKeepBands(
  renderedHeight,
  sliceHeight,
  pageCanvasHeight,
  canvasHeight,
  bands,
) {
  const pageLimit = Math.min(pageCanvasHeight, canvasHeight - renderedHeight)
  const idealAbs = renderedHeight + Math.min(sliceHeight, pageLimit)
  const minAbs = renderedHeight + Math.max(24, pageLimit * 0.18)
  const maxAbs = renderedHeight + pageLimit

  if (isCleanCut(idealAbs, bands)) {
    return idealAbs - renderedHeight
  }

  let bestPullBack = null
  for (const band of bands) {
    if (!cutSplitsBand(idealAbs, band)) continue
    const candidate = band.top
    if (candidate < minAbs || candidate > idealAbs) continue
    if (!isCleanCut(candidate, bands)) continue
    if (bestPullBack === null || candidate > bestPullBack) bestPullBack = candidate
  }
  if (bestPullBack !== null) return Math.max(1, bestPullBack - renderedHeight)

  let bestExtend = null
  for (const band of bands) {
    if (!cutSplitsBand(idealAbs, band)) continue
    if (band.bottom > maxAbs + 0.5) continue
    if (band.top < minAbs && isCleanCut(band.bottom, bands)) {
      if (bestExtend === null || band.bottom > bestExtend) bestExtend = band.bottom
    }
  }
  if (bestExtend !== null) {
    return Math.max(1, Math.min(pageLimit, bestExtend - renderedHeight))
  }

  return Math.max(1, Math.min(pageLimit, idealAbs - renderedHeight))
}

// Абзац пересекает границу → режем до его начала (уходит на след. страницу)
{
  const cut = adjustSliceForKeepBands(0, 1000, 1000, 5000, [{ top: 900, bottom: 1100 }])
  assert.equal(cut, 900)
}

// Блок начался слишком рано для переноса, но конец влезает → дотягиваем
{
  const cut = adjustSliceForKeepBands(0, 1000, 1000, 5000, [{ top: 100, bottom: 950 }])
  // ideal 1000 не режет этот блок (bottom < 1000) → чистый разрез 1000
  assert.equal(cut, 1000)
}

// Блок начался рано и пересекает ideal, конец влезает → extend
{
  const cut = adjustSliceForKeepBands(0, 1000, 1000, 5000, [{ top: 100, bottom: 1050 }])
  // top 100 < minAbs(180) → нельзя pull-back; bottom 1050 > maxAbs → forced 1000
  assert.equal(cut, 1000)
}

{
  const cut = adjustSliceForKeepBands(0, 1000, 1000, 5000, [{ top: 50, bottom: 980 }])
  // Не пересекает 1000 → 1000
  assert.equal(cut, 1000)
}

{
  // Пересечение + конец в пределах страницы + старт раньше minSlice → extend до 980
  const cut = adjustSliceForKeepBands(0, 900, 1000, 5000, [{ top: 50, bottom: 980 }])
  assert.equal(cut, 980)
}

// Чистый разрез
{
  const cut = adjustSliceForKeepBands(0, 1000, 1000, 5000, [{ top: 100, bottom: 200 }])
  assert.equal(cut, 1000)
}

console.log('html-to-pdf page-break tests: ok')
