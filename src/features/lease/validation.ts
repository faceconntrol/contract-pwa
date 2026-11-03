import type { LeaseErrors, LeaseFormState } from './types'

/** Поля необязательны — документ формируется в любом случае. */
export function validateLeaseForm(_form: LeaseFormState): LeaseErrors {
  return {}
}
