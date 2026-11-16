/** Предустановленные марки/модели — можно выбрать из списка или ввести свою. */
export const VEHICLE_MAKE_MODELS = [
  'Mercedes-Benz E-class',
  'Mercedes-Benz S-class',
  'Mercedes-Benz V-class',
  'Mercedes-Benz Maybach S-class',
  'BMW 5-series',
  'BMW 7-series',
] as const

export type VehicleMakeModelPreset = (typeof VEHICLE_MAKE_MODELS)[number]

/** id для HTML datalist (общий на странице). */
export const VEHICLE_MAKE_MODEL_LIST_ID = 'vehicle-make-model-presets'
