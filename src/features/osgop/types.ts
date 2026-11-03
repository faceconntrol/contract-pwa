import { TENANT } from '@/features/shared/constants/tenant'
import { TRANSPORT_TYPES } from '@/features/shared/constants/transport-types'

export type OsgopVehicleGroup = 'include' | 'exclude'

export interface OsgopVehicleRow {
  id: string
  transportType: string
  customTransportType: string
  makeModel: string
  plate: string
  capacity: string
  seats: string
  year: string
}

export interface OsgopFormState {
  osgopContractNumber: string
  clientName: string
  osgopDate: string
  includeVehicles: OsgopVehicleRow[]
  excludeVehicles: OsgopVehicleRow[]
}

export type OsgopErrors = Partial<Record<string, string>>

export function createVehicleRow(): OsgopVehicleRow {
  return {
    id: crypto.randomUUID(),
    transportType: TRANSPORT_TYPES[0] ?? '',
    customTransportType: '',
    makeModel: '',
    plate: '',
    capacity: '',
    seats: '',
    year: '',
  }
}

export function createEmptyOsgopForm(): OsgopFormState {
  return {
    osgopContractNumber: TENANT.defaultOsgopContractNumber,
    clientName: TENANT.defaultClientName,
    osgopDate: '',
    includeVehicles: [createVehicleRow()],
    excludeVehicles: [],
  }
}
