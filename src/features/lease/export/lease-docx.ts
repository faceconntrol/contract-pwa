import {
  AlignmentType,
  BorderStyle,
  Document,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  Paragraph,
  TabStopType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  TextWrappingType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from 'docx'
import { dataUrlToStampBinary } from '@/features/shared/lib/stamp-image'
import type { LeaseDocumentModel } from './lease-model'

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'FFFFFF',
}
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
}

/** Поля страницы слева/справа — одинаковые, чтобы город и дата зеркально примыкали к краям. */
const PAGE_MARGIN_DXA = 900
/** Ширина области текста A4: 11906 − 2×900. */
const CONTENT_WIDTH_DXA = 11906 - PAGE_MARGIN_DXA * 2

function p(text: string, options?: { bold?: boolean; center?: boolean }): Paragraph {
  return new Paragraph({
    alignment: options?.center ? AlignmentType.CENTER : AlignmentType.BOTH,
    spacing: { after: 120 },
    children: [new TextRun({ text, bold: options?.bold, font: 'Times New Roman', size: 24 })],
  })
}

/** «г. Москва» слева, дата у правого края через right-tab (таблицы в Word дают лишний отступ). */
function headerPlaceAndDate(city: string, date: string): Paragraph {
  return new Paragraph({
    spacing: { after: 200 },
    tabStops: [
      {
        type: TabStopType.RIGHT,
        // ровно ширина текстовой области — дата к правому полю страницы
        position: CONTENT_WIDTH_DXA,
      },
    ],
    children: [
      new TextRun({ text: city, font: 'Times New Roman', size: 24 }),
      new TextRun({ text: '\t', font: 'Times New Roman', size: 24 }),
      new TextRun({ text: date, font: 'Times New Roman', size: 24 }),
    ],
  })
}

function vehicleRow(label: string, value: string): TableRow {
  const border = { style: BorderStyle.SINGLE, size: 8, color: '333333' }
  const borders = { top: border, bottom: border, left: border, right: border }
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 4500, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: label, font: 'Times New Roman', size: 24 })] })],
      }),
      new TableCell({
        borders,
        width: { size: 4500, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: value, font: 'Times New Roman', size: 24 })] })],
      }),
    ],
  })
}

export async function buildLeaseDocx(model: LeaseDocumentModel): Promise<Blob> {
  const t = model.tenant
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1008,
              right: PAGE_MARGIN_DXA,
              bottom: 1008,
              left: PAGE_MARGIN_DXA,
            },
          },
        },
        children: [
          p(`ДОГОВОР № ${model.contractNumber}`, { bold: true, center: true }),
          p('аренды транспортного средства без экипажа', { bold: true, center: true }),
          headerPlaceAndDate('г. Москва', model.contractDateLong),
          p(
            `${model.landlordPreamble}, с одной стороны, и ${t.fullName} (ОГРНИП ${t.ogrnip} ИНН ${t.inn}), ${t.addressCompact}, действующая на основании листа записи ЕГРИП о регистрации ИП, именуемая в дальнейшем «Арендатор», с другой стороны, заключили настоящий договор о нижеследующем:`,
          ),
          p('1. Предмет договора', { bold: true }),
          p(
            '1.1. Арендодатель обязуется предоставить Арендатору транспортное средство, указанное в пункте 1.2. Договора (далее — автомобиль), за плату во временное владение и пользование без оказания услуг по управлению, а Арендатор обязуется своевременно выплачивать Арендодателю установленную настоящим Договором арендную плату и по окончании срока аренды возвратить автомобиль Арендодателю в исправном состоянии.',
          ),
          p('1.2. Арендодатель предоставляет, а Арендатор принимает транспортное средство:'),
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            rows: [
              vehicleRow('Марка, модель машины', model.vehicleMakeModel),
              vehicleRow('Регистрационный знак', model.plate),
              vehicleRow('Идентификационный номер (VIN)', model.vin),
              vehicleRow('Год выпуска', model.year),
              vehicleRow('Цвет', model.color),
              vehicleRow('Тип двигателя', model.engineType),
              vehicleRow('Свидетельство регистрации ТС', model.sts),
              vehicleRow('Паспорт ТС', model.pts),
            ],
          }),
          p(
            `1.2. Срок аренды устанавливается с ${model.rentFromLong} по ${model.rentToLong}. В случае отсутствия письменных возражений по истечении срока аренды, Договор пролонгируется на тех же условиях.`,
          ),
          p(
            `1.3. Передаваемое в аренду транспортное средство принадлежит Арендодателю на праве собственности, что подтверждается Паспортом ${model.pts} и Свидетельством регистрации ТС ${model.sts}. Арендодатель гарантирует, что на момент заключения настоящего Договора транспортное средство не является предметом залога и не обременено другими правами третьих лиц.`,
          ),
          p(
            '1.4. В момент передачи и возврата транспортного средства стороны составляют и подписывают Акт приема-передачи транспортного средства (Приложение №1 к договору).',
          ),
          p('1.5. Автомобиль будет эксплуатироваться для коммерческого использования и оказания транспортных услуг.'),
          p('1.6. Автомобиль передается Арендатору с правом пересдачи его в субаренду.'),
          p('1.7. Автомобиль передается Арендатору для осуществления коммерческой деятельности.'),
          p('2. Права и обязанности сторон', { bold: true }),
          p('2.1. Права и обязанности Арендодателя:'),
          p('2.1.1. Арендодатель обязан передать Арендатору технически исправный автомобиль.'),
          p('2.1.2. Арендодатель обязан обеспечить Арендатора общей информацией об автомобиле.'),
          p('2.1.3. Арендодатель обязан застраховать автомобиль по полисам КАСКО и ОСАГО.'),
          p(
            '2.1.4. Арендодатель вправе досрочно прекратить Договор и потребовать незамедлительного возврата автомобиля в случае неоднократного нарушения Арендатором каких-либо условий Договора; по основаниям, предусмотренным действующим законодательством РФ для таких договоров.',
          ),
          p('2.2. Права и обязанности Арендатора:'),
          p(
            '2.2.1. Арендатор обязан использовать автомобиль строго в соответствии с его целевым назначением и в соответствии с Руководством по эксплуатации автомобиля.',
          ),
          p(
            '2.2.2. Арендатор обязан использовать для заправки автомобиля только то топливо, которое указано производителем автомобиля.',
          ),
          p(
            '2.2.3. Арендатор несет все расходы, связанные с непосредственной эксплуатацией автомобиля, в том числе по оплате ГСМ, мойки, парковки, стоянки, штрафов за нарушение ПДД. Не допускается управление автомобилем в состоянии опьянения.',
          ),
          p(
            '2.2.4. Во всех случаях изменения адреса или телефона Арендатор обязан в письменной форме не позднее одного рабочего дня информировать об этом Арендодателя.',
          ),
          p('2.2.5. Передача автомобиля Арендатору оформляется подписанием сторонами Приложения №1 к настоящему Договору.'),
          p(
            '2.2.6. В случае причинения арендуемому автомобилю ущерба по вине Арендатора при наличии КАСКО/ОСАГО, Арендатор возмещает убытки в пределах франшизы КАСКО и арендной платы за период ремонта.',
          ),
          p('3. Размер арендной платы. Порядок расчетов', { bold: true }),
          p(
            `3.1.1. Размер арендной платы составляет ${model.dailyPrice} рублей за каждые сутки аренды.`,
          ),
          p('3.1.2. Арендатор уплачивает арендную плату еженедельно, в виде оплаты за неделю аренды вперед.'),
          p(
            '3.2. По соглашению сторон возможны любые формы расчетов по настоящему договору, допускаемые действующим законодательством РФ.',
          ),
          p('4. Порядок содержания арендованного имущества', { bold: true }),
          p(
            '4.1. Арендатор обязан предоставлять автомобиль Арендодателю для ТО и сезонной смены шин; время ТО не входит в период аренды и не оплачивается.',
          ),
          p(
            '4.2. Все расходы по страхованию КАСКО и ОСАГО несёт Арендодатель. При окончании страховки Арендодатель обязан продлить полис за свой счёт.',
          ),
          p('4.3. Автомобиль не будет использоваться для обучения вождению.'),
          p('4.4. Стороны ограничили ежемесячный пробег автомобиля в размере 20 000 километров.'),
          p('5. Ответственность сторон', { bold: true }),
          p(
            '5.1. В случае утраты автомобиля (угон, хищение) Арендатор обязуется незамедлительно сообщить Арендодателю и в МВД, а также предоставить СТС и комплект ключей в течение одного календарного дня.',
          ),
          p(
            '5.2. Арендодатель обязуется осуществлять сезонную замену резины, заранее предупредив Арендатора.',
          ),
          p('6. Срок действия договора и порядок расторжения', { bold: true }),
          p('6.1. Договор вступает в силу с момента подписания и действует в течение всего срока аренды.'),
          p(
            '6.2. Любая из сторон может отказаться от договора в одностороннем порядке, письменно предупредив другую сторону не менее чем за 7 календарных дней.',
          ),
          p('7. Прочие условия', { bold: true }),
          p('7.1. Изменения действительны при письменной форме и подписании обеими сторонами.'),
          p('7.2. Споры разрешаются в суде по месту нахождения Арендатора.'),
          p(
            '7.3. При временной приостановке договора Арендатор предупреждает не менее чем за 2 дня и возвращает автомобиль Арендодателю.',
          ),
          p('7.4. ТС передаётся и возвращается по Акту приема-передачи ТС.'),
          p(
            '7.5. ТС сдаётся в чистом виде с указанным топливом и комплектацией; возвращается в том же состоянии.',
          ),
          p('7.6. Срок ответа на претензию — 10 календарных дней.'),
          p('7.7. Место жительства Арендодателя определяется в разделе 8 настоящего договора.'),
          p(
            '7.8. Настоящий договор составлен в двух экземплярах, имеющих равную юридическую силу, по одному для каждой из сторон.',
          ),
          p('8. Реквизиты сторон', { bold: true }),
          await partiesTable(model),
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}

function partyCellParagraphs(lines: Array<{ text: string; bold?: boolean }>): Paragraph[] {
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: line.text,
            bold: line.bold,
            font: 'Times New Roman',
            size: 24,
          }),
        ],
      }),
  )
}

async function buildLandlordSignParagraph(
  signName: string,
  stampDataUrl: string,
): Promise<Paragraph> {
  const children: Array<TextRun | ImageRun> = []

  if (stampDataUrl) {
    const stamp = await dataUrlToStampBinary(stampDataUrl)
    if (stamp) {
      const maxEdge = 100
      const scale = Math.min(1, maxEdge / Math.max(stamp.width, stamp.height))
      const width = Math.max(1, Math.round(stamp.width * scale))
      const height = Math.max(1, Math.round(stamp.height * scale))

      // Печать поверх строки подписи (floating, без обтекания)
      children.push(
        new ImageRun({
          data: stamp.bytes,
          type: stamp.type,
          transformation: { width, height },
          floating: {
            horizontalPosition: {
              relative: HorizontalPositionRelativeFrom.CHARACTER,
              align: HorizontalPositionAlign.CENTER,
            },
            verticalPosition: {
              relative: VerticalPositionRelativeFrom.LINE,
              align: VerticalPositionAlign.CENTER,
            },
            allowOverlap: true,
            behindDocument: false,
            layoutInCell: true,
            wrap: { type: TextWrappingType.NONE },
            zIndex: 20,
          },
        }),
      )
    }
  }

  children.push(
    new TextRun({
      text: `Подпись ___________ (_${signName}_)`,
      font: 'Times New Roman',
      size: 24,
    }),
  )

  return new Paragraph({
    spacing: { before: 200, after: 60 },
    keepLines: true,
    children,
  })
}

async function partiesTable(model: LeaseDocumentModel): Promise<Table> {
  const t = model.tenant
  const half = Math.floor(CONTENT_WIDTH_DXA / 2)
  const right = CONTENT_WIDTH_DXA - half
  const landlordSignParagraph = await buildLandlordSignParagraph(
    model.landlordSignName,
    model.landlordStampDataUrl,
  )

  const cell = (width: number, paragraphs: Paragraph[]) =>
    new TableCell({
      borders: NO_BORDERS,
      width: { size: width, type: WidthType.DXA },
      children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [] })],
    })

  const landlordSignChildren: Paragraph[] = [landlordSignParagraph]

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [half, right],
    rows: [
      new TableRow({
        children: [
          cell(
            half,
            partyCellParagraphs([
              { text: 'АРЕНДОДАТЕЛЬ:', bold: true },
              ...model.landlordRequisiteLines.map((text) => ({ text })),
            ]),
          ),
          cell(
            right,
            partyCellParagraphs([
              { text: 'АРЕНДАТОР:', bold: true },
              { text: t.fullName },
              { text: `ОГРНИП ${t.ogrnip}` },
              { text: `ИНН ${t.inn}` },
              { text: t.address },
              { text: 'Банковские реквизиты:' },
              { text: `р/с ${t.bankAccount}` },
              { text: `в ${t.bankName}` },
              { text: `БИК ${t.bik}` },
            ]),
          ),
        ],
      }),
      new TableRow({
        children: [
          cell(half, [
            new Paragraph({
              spacing: { before: 400, after: 120 },
              children: [
                new TextRun({
                  text: `Дата: ${model.contractDate}`,
                  font: 'Times New Roman',
                  size: 24,
                }),
              ],
            }),
          ]),
          cell(right, [
            new Paragraph({
              spacing: { before: 400, after: 120 },
              children: [
                new TextRun({
                  text: `Дата: ${model.contractDate}`,
                  font: 'Times New Roman',
                  size: 24,
                }),
              ],
            }),
          ]),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          cell(half, landlordSignChildren),
          cell(right, [
            new Paragraph({
              spacing: { before: 200, after: 60 },
              keepLines: true,
              children: [
                new TextRun({
                  text: `Подпись ___________ (_${t.shortName}_)`,
                  font: 'Times New Roman',
                  size: 24,
                }),
              ],
            }),
          ]),
        ],
      }),
    ],
  })
}
