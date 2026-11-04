# Contract PWA

Офлайн PWA для заполнения:
1. договора аренды ТС без экипажа;
2. заявления на ввод/вывод ТС из договора ОСГОП.

## Онлайн (телефон / PWA)

Сайт: **https://faceconntrol.github.io/contract-pwa/**

На телефоне откройте ссылку в Safari (iOS) или Chrome (Android) → «На экран Домой» / «Установить приложение». После первого открытия работает офлайн.

## Запуск локально

```bash
cd /Users/tony/contract-pwa
npm install
npm run dev
```

Сборка:

```bash
npm run build
npm run preview
```

Сборка под GitHub Pages: `npm run build:gh`

После первого открытия в браузере приложение кешируется Service Worker и работает офлайн. Можно установить как PWA.

## Что внутри

- Vue 3 + Vite + TypeScript + `vite-plugin-pwa`
- Экспорт **PDF** (`html2pdf.js`) и **DOCX** (`docx`)
- Черновики в `localStorage`
- Арендатор (ИП Аверьянова) зафиксирован в шаблоне договора
- Договор аренды: выбор арендодателя **ФЛ / ЮЛ**; для ЮЛ — подстановка по ИНН (сервис htmlweb.ru, работает с телефона; нужен интернет)

Исходные примеры документов: `templates/source/`

Спека и план: `plan-build/`
