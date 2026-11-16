/**
 * Автоопределение рода по отчеству.
 * Запуск: node src/features/lease/export/lease-gender.test.mjs
 */

function detectGenderFromFullName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const middle = parts[2] || ''
  const lower = middle.toLowerCase()
  if (lower.endsWith('вна') || lower.endsWith('чна') || lower.endsWith('кызы')) return 'female'
  return 'male'
}

function buildFlPreamble(name, address) {
  const gender = detectGenderFromFullName(name)
  const citizen = gender === 'female' ? 'Гражданка РФ' : 'Гражданин РФ'
  const registered =
    gender === 'female' ? 'зарегистрированная по адресу' : 'зарегистрированный по адресу'
  const named = gender === 'female' ? 'именуемая' : 'именуемый'
  return `${citizen} ${name}, ${registered} ${address}, ${named} в дальнейшем «Арендодатель»`
}

const female = buildFlPreamble('Иванова Анна Петровна', 'г. Москва')
if (!female.includes('Гражданка РФ') || !female.includes('именуемая')) {
  throw new Error(`female failed: ${female}`)
}

const male = buildFlPreamble('Иванов Иван Петрович', 'г. Москва')
if (!male.includes('Гражданин РФ') || !male.includes('именуемый')) {
  throw new Error(`male failed: ${male}`)
}

console.log('lease-gender tests: ok')
