# Build Plan: Contract PWA
**Created:** 2026-10-30  
**Spec:** plan-build/specs/contract-pwa-spec-2026-10-30.md  
**Brainstorm:** plan-build/brainstorm/contract-pwa-brainstorm-2026-10-30.md  
**Status:** Executing  
**Project type:** Greenfield

## Overview
Vue 3 + Vite + TS PWA: формы договора и ОСГОП, черновики, экспорт PDF/DOCX офлайн.

## Component Inventory
| Component | Inputs | Outputs | Deps |
|-----------|--------|---------|------|
| AppShell | — | routes/views | vue-router, vite-plugin-pwa |
| LeaseForm | draft | LeaseDocument | zod/manual validate |
| OsgopForm | draft | OsgopDocument | — |
| draftStore | form state | localStorage | — |
| docxLease / docxOsgop | model | Blob docx | `docx` |
| pdfLease / pdfOsgop | model | Blob pdf | html2pdf.js |
| download | Blob, filename | file save | — |

## Flow 0: Signup → First Use
N/A — без аккаунтов. First use: открыть → выбрать договор → заполнить → скачать PDF/DOCX.

## Integration Contracts
Form → Exporter: типизированный объект модели (см. spec Data Model).  
Exporter → Browser: `URL.createObjectURL` + `<a download>`.  
SW → Cache: app shell + assets (vite-plugin-pwa generateSW).

## End-to-End Flows
1. Lease happy: fill → validate → docx/pdf → download  
2. OSGOP include/exclude → table rows → export  
3. Draft restore on reload  
4. Offline after first load  

## Convention Guide
- Feature folders under `src/features/{lease,osgop,shared}/`
- Types: PascalCase; files: kebab-case
- Strict TS; no `any`
- Russian UI strings

## Wiring Checklist
- [ ] Vite+Vue+TS scaffold
- [ ] PWA plugin + manifest + icons
- [ ] Lease form + validation + draft
- [ ] OSGOP form + modes + vehicle rows + draft
- [ ] DOCX generators (lease, osgop)
- [ ] PDF generators (lease, osgop)
- [ ] Download helpers + filenames
- [ ] Offline smoke (build + preview)

## Build Order
1. Scaffold + PWA shell  
2. Shared types/utils/draft/download  
3. Lease form + exporters  
4. OSGOP form + exporters  
5. Polish + build verify  
