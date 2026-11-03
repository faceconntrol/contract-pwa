# Brainstorm: Contract PWA
**Created:** 2026-10-30  
**Spec:** plan-build/specs/contract-pwa-spec-2026-10-30.md  
**Status:** Approved (user: делай MVP)  
**Project type:** Greenfield

## Vision
Личный офлайн-PWA: форма → договор аренды / заявление ОСГОП → PDF или DOCX.

## Existing Context
Greenfield. Стек: Vue 3 + Vite + TypeScript + vite-plugin-pwa.

## Components Identified

### App Shell (Vue + PWA)
- **Responsibility**: UI, роутинг типов документов, SW/manifest
- **Upstream**: пользователь
- **Downstream**: Form + Exporters
- **Hands test**: PASS — vite-plugin-pwa

### LeaseForm / OsgopForm
- **Responsibility**: ввод + валидация + черновик localStorage
- **Hands test**: PASS

### DocumentModel (types + mappers)
- **Responsibility**: типизированная модель → данные для шаблонов
- **Hands test**: PASS

### DocxExporter
- **Responsibility**: генерация DOCX через `docx` (программная сборка по структуре примера)
- **Hands test**: PASS — без бинарных мастер-файлов, структура в коде

### PdfExporter
- **Responsibility**: печатный HTML → PDF через `html2pdf.js` / print window
- **Hands test**: PASS — клиентский PDF с кириллицей

### Template Source Archive
- **Responsibility**: исходные примеры в `templates/source/` для сверки
- **Hands test**: PASS

## Rough Dependency Map
UI Form → DocumentModel → DocxExporter | PdfExporter → download blob

## Risk Assessment
- PDF кириллица/переносы — проверять на реальном экспорте
- Точное визуальное совпадение с исходным PDF не требуется в MVP; юридический текст — по смыслу примера
- git init может требовать Xcode license на этой машине — не блокер для npm

## Open Questions
Нет — пользователь утвердил MVP и стек.
