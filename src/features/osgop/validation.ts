import type { OsgopErrors, OsgopFormState } from './types'

/** Поля необязательны — документ формируется в любом случае. */
export function validateOsgopForm(_form: OsgopFormState): OsgopErrors {
  return {}
}
