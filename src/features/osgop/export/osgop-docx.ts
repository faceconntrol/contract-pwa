import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { OsgopDocumentModel, OsgopVehicleModel } from './osgop-model'

function text(value: string, bold = false): TextRun {
  return new TextRun({ text: value, bold, font: 'Times New Roman', size: 20 })
}

function cell(value: string, width: number, bold = false): TableCell {
  const border = { style: BorderStyle.SINGLE, size: 6, color: '333333' }
  return new TableCell({
    borders: { top: border, bottom: border, left: border, right: border },
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [text(value, bold)],
      }),
    ],
  })
}

function headerRow(): TableRow {
  return new TableRow({
    children: [
      cell('Вид транспорта и вид перевозок', 2400, true),
      cell('№ п/п', 700, true),
      cell('Марка и модель т/с', 1800, true),
      cell('Государственный регистрационный знак', 1800, true),
      cell('Пассажировместимость', 1100, true),
      cell('Количество посадочных мест', 1200, true),
      cell('Год выпуска', 900, true),
    ],
  })
}

function vehicleRows(vehicles: OsgopVehicleModel[]): TableRow[] {
  if (vehicles.length === 0) {
    return [
      new TableRow({
        children: [cell('Нет ТС', 9900)],
      }),
    ]
  }
  return vehicles.map(
    (v) =>
      new TableRow({
        children: [
          cell(v.transportType, 2400),
          cell(String(v.index), 700),
          cell(v.makeModel, 1800),
          cell(v.plate, 1800),
          cell(v.capacity, 1100),
          cell(v.seats, 1200),
          cell(v.year, 900),
        ],
      }),
  )
}

function sectionBlocks(title: string, vehicles: OsgopVehicleModel[]) {
  return [
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [text(title, true)],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [text('Названия видов перевозок не меняются!')],
    }),
    new Table({
      width: { size: 9900, type: WidthType.DXA },
      rows: [headerRow(), ...vehicleRows(vehicles)],
    }),
  ]
}

export async function buildOsgopDocx(model: OsgopDocumentModel): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              text('ЗАЯВЛЕНИЕ на Ввод/вывод ТС из договора ОСГОП к Аддендуму №1', true),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [text(`Номер договора: ${model.osgopContractNumber}`)],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [text(`Название клиента: ${model.clientName}`)],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [text(`Дата включения(исключения) ТС: ${model.osgopDate}`)],
          }),
          ...sectionBlocks('Таб. 1 (Включение ТС)', model.includeVehicles),
          ...sectionBlocks('Таб. 2 (Исключение ТС)', model.excludeVehicles),
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}
