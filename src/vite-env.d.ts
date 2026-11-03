/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'petrovich' {
  export type PetrovichGender = 'male' | 'female' | 'androgynous'
  export type PetrovichCase =
    | 'nominative'
    | 'genitive'
    | 'dative'
    | 'accusative'
    | 'instrumental'
    | 'prepositional'

  export interface PetrovichPerson {
    gender?: PetrovichGender
    first?: string
    middle?: string
    last?: string
  }

  interface PetrovichFn {
    (person: PetrovichPerson, gcase: PetrovichCase): PetrovichPerson
    detect_gender(middleName: string): PetrovichGender
  }

  const petrovich: PetrovichFn
  export default petrovich
}
