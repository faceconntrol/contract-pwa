export type LandlordType = 'fl' | 'ul'

/** Пол арендодателя/руководителя: auto — по отчеству. */
export type LandlordGender = 'auto' | 'male' | 'female'

export interface LeaseFormState {
  landlordType: LandlordType
  plate: string
  contractDate: string
  /** ФЛ: ФИО */
  landlordFullName: string
  /** ФЛ / ЮЛ: пол для согласования рода в тексте договора */
  landlordGender: LandlordGender
  /** ФЛ: дата рождения */
  landlordBirthDate: string
  /** ФЛ: адрес регистрации */
  landlordAddress: string
  /** ЮЛ: название организации */
  companyName: string
  /** ЮЛ: ИНН */
  companyInn: string
  /** ЮЛ: ОГРН */
  companyOgrn: string
  /** ЮЛ: КПП */
  companyKpp: string
  /** ЮЛ: юридический адрес */
  companyAddress: string
  /** ЮЛ: должность в тексте договора, напр. «генерального директора» */
  directorPosition: string
  /** ЮЛ: ФИО руководителя в родительном падеже (текст «в лице …») */
  directorName: string
  /** ЮЛ: ФИО в именительном (для подписи); заполняется из ЕГРЮЛ */
  directorNameNominative: string
  /** ЮЛ: основание полномочий, напр. «Устава» */
  directorBasis: string
  vehicleMakeModel: string
  vin: string
  year: string
  color: string
  engineType: string
  sts: string
  pts: string
  rentFrom: string
  rentTo: string
  dailyPrice: string
  /** Data URL печати арендодателя (PNG/JPEG). */
  landlordStampDataUrl: string
}

export type LeaseField = keyof LeaseFormState

export type LeaseErrors = Partial<Record<string, string>>

export function createEmptyLeaseForm(): LeaseFormState {
  return {
    landlordType: 'fl',
    plate: '',
    contractDate: '',
    landlordFullName: '',
    landlordGender: 'auto',
    landlordBirthDate: '',
    landlordAddress: '',
    companyName: '',
    companyInn: '',
    companyOgrn: '',
    companyKpp: '',
    companyAddress: '',
    directorPosition: 'генерального директора',
    directorName: '',
    directorNameNominative: '',
    directorBasis: 'Устава',
    vehicleMakeModel: '',
    vin: '',
    year: '',
    color: '',
    engineType: '',
    sts: '',
    pts: '',
    rentFrom: '',
    rentTo: '2030-11-01',
    dailyPrice: '',
    landlordStampDataUrl: '',
  }
}
