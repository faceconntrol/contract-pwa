/** 7000 → «7 000» */
export function formatRubAmount(value: number): string {
  return Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
