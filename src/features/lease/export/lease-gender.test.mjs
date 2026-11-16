/**
 * Проверка согласования рода в преамбуле ФЛ.
 * Запуск: node src/features/lease/export/lease-gender.test.mjs
 */

function resolvePersonGender(fullName, hint) {
  if (hint === 'male' || hint === 'female') return hint
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const middle = parts[2] || ''
  const lower = middle.toLowerCase()
  if (lower.endsWith('вна') || lower.endsWith('чна') || lower.endsWith('кызы')) return 'female'
  return 'male'
}

function buildFlPreamble(form) {
  const name = form.landlordFullName
  const gender = resolvePersonGender(name, form.landlordGender)
  const citizen = gender === 'female' ? 'Гражданка РФ' : 'Гражданин РФ'
  const registered =
    gender === 'female' ? 'зарегистрированная по адресу' : 'зарегистрированный по адресу'
  const named = gender === 'female' ? 'именуемая' : 'именуемый'
  return `${citizen} ${name}, ${registered} ${form.landlordAddress}, ${named} в дальнейшем «Арендодатель»`
}

const female = buildFlPreamble({
  landlordFullName: 'Иванова Анна Петровна',
  landlordGender: 'auto',
  landlordAddress: 'г. Москва',
})
if (!female.includes('Гражданка РФ') || !female.includes('зарегистрированная') || !female.includes('именуемая')) {
  throw new Error(`female preamble failed: ${female}`)
}

const maleForced = buildFlPreamble({
  landlordFullName: 'Иванова Анна Петровна',
  landlordGender: 'male',
  landlordAddress: 'г. Москва',
})
if (!maleForced.includes('Гражданин РФ') || !maleForced.includes('именуемый')) {
  throw new Error(`forced male failed: ${maleForced}`)
}

console.log('lease-gender tests: ok')
