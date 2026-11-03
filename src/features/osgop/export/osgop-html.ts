import type { OsgopDocumentModel, OsgopVehicleModel } from './osgop-model'

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function buildTable(title: string, vehicles: OsgopVehicleModel[]): string {
  const rows =
    vehicles.length > 0
      ? vehicles
          .map(
            (v) => `<tr>
      <td>${esc(v.transportType)}</td>
      <td class="num">${v.index}</td>
      <td>${esc(v.makeModel)}</td>
      <td>${esc(v.plate)}</td>
      <td class="num">${esc(v.capacity)}</td>
      <td class="num">${esc(v.seats)}</td>
      <td class="num">${esc(v.year)}</td>
    </tr>`,
          )
          .join('')
      : `<tr><td colspan="7" class="empty">Нет ТС</td></tr>`

  return `
  <p class="note"><strong>${esc(title)}</strong></p>
  <p class="note">Названия видов перевозок не меняются!</p>
  <table>
    <thead>
      <tr>
        <th>Вид транспорта и вид перевозок</th>
        <th>№ п/п</th>
        <th>Марка и модель т/с</th>
        <th>Государственный регистрационный знак</th>
        <th>Пассажировместимость</th>
        <th>Количество посадочных мест</th>
        <th>Год выпуска</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
}

export function buildOsgopHtml(model: OsgopDocumentModel): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 landscape; margin: 12mm; }
  html, body {
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    color: #111111 !important;
    background: #ffffff !important;
    margin: 0;
    padding: 12px;
  }
  h1 { font-size: 13pt; text-align: center; margin: 0 0 14px; }
  .meta p { margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 18px; }
  th, td { border: 1px solid #333; padding: 4px 6px; vertical-align: top; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  td.num { text-align: center; }
  td.empty { text-align: center; color: #666; font-style: italic; }
  .note { margin-top: 6px; font-size: 10pt; }
  .pdf-keep-together,
  .meta,
  .note,
  h1,
  thead,
  tbody tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
</style>
</head>
<body>
  <h1>ЗАЯВЛЕНИЕ на Ввод/вывод ТС из договора ОСГОП к Аддендуму №1</h1>
  <div class="meta">
    <p>Номер договора: <strong>${esc(model.osgopContractNumber)}</strong></p>
    <p>Название клиента: <strong>${esc(model.clientName)}</strong></p>
    <p>Дата включения(исключения) ТС: <strong>${esc(model.osgopDate)}</strong></p>
  </div>
  ${buildTable('Таб. 1 (Включение ТС)', model.includeVehicles)}
  ${buildTable('Таб. 2 (Исключение ТС)', model.excludeVehicles)}
</body>
</html>`
}
