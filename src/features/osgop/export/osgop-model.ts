import { CUSTOM_TRANSPORT_OPTION } from '@/features/shared/constants/transport-types'
import { formatRuDate } from '@/features/shared/lib/dates'
import { normalizePlate } from '@/features/shared/lib/plate'
import { asTrimmedString } from '@/features/shared/lib/string'
import type { OsgopFormState, OsgopVehicleRow } from '../types'

export interface OsgopVehicleModel {
  index: number
  transportType: string
  makeModel: string
  plate: string
  capacity: string
  seats: string
  year: string
}

export interface OsgopDocumentModel {
  osgopContractNumber: string
  clientName: string
  osgopDate: string
  includeVehicles: OsgopVehicleModel[]
  excludeVehicles: OsgopVehicleModel[]
}

/** Строка без пользовательских данных (дефолтный select вида перевозок не считается). */
function isVehicleRowEmpty(row: OsgopVehicleRow): boolean {
  const customTransport =
    row.transportType === CUSTOM_TRANSPORT_OPTION
      ? asTrimmedString(row.customTransportType)
      : ''
  return (
    !asTrimmedString(row.makeModel) &&
    !asTrimmedString(row.plate) &&
    !asTrimmedString(row.capacity) &&
    !asTrimmedString(row.seats) &&
    !asTrimmedString(row.year) &&
    !customTransport
  )
}

function mapVehicles(rows: OsgopVehicleRow[]): OsgopVehicleModel[] {
  return rows
    .filter((row) => !isVehicleRowEmpty(row))
    .map((row, index) => {
      const transportType =
        row.transportType === CUSTOM_TRANSPORT_OPTION
          ? asTrimmedString(row.customTransportType)
          : asTrimmedString(row.transportType)
      return {
        index: index + 1,
        transportType,
        makeModel: asTrimmedString(row.makeModel),
        plate: normalizePlate(asTrimmedString(row.plate)),
        capacity: asTrimmedString(row.capacity),
        seats: asTrimmedString(row.seats),
        year: asTrimmedString(row.year),
      }
    })
}

export function toOsgopDocumentModel(form: OsgopFormState): OsgopDocumentModel {
  return {
    osgopContractNumber: asTrimmedString(form.osgopContractNumber),
    clientName: asTrimmedString(form.clientName),
    osgopDate: formatRuDate(asTrimmedString(form.osgopDate)),
    includeVehicles: mapVehicles(form.includeVehicles),
    excludeVehicles: mapVehicles(form.excludeVehicles),
  }
}
