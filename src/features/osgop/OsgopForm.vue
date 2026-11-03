<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import {
  CUSTOM_TRANSPORT_OPTION,
  TRANSPORT_TYPES,
} from '@/features/shared/constants/transport-types'
import { clearDraft, loadDraft, saveDraft } from '@/features/shared/lib/draft'
import { downloadBlob } from '@/features/shared/lib/download'
import { formatFileDate, todayIso } from '@/features/shared/lib/dates'
import { normalizePlate } from '@/features/shared/lib/plate'
import { toOsgopDocumentModel } from './export/osgop-model'
import {
  createEmptyOsgopForm,
  createVehicleRow,
  type OsgopErrors,
  type OsgopFormState,
  type OsgopVehicleGroup,
  type OsgopVehicleRow,
} from './types'
import { validateOsgopForm } from './validation'

const DRAFT_KEY = 'contract-pwa:draft:osgop' as const

const form = reactive<OsgopFormState>(createEmptyOsgopForm())
const errors = ref<OsgopErrors>({})
const draftWarning = ref(false)
const busy = ref<'pdf' | 'docx' | null>(null)
const exportError = ref('')

function normalizeLoadedDraft(raw: unknown): OsgopFormState {
  const empty = createEmptyOsgopForm()
  if (!raw || typeof raw !== 'object') return empty
  const draft = raw as Partial<OsgopFormState> & {
    mode?: string
    vehicles?: OsgopVehicleRow[]
  }

  // Миграция со старого формата (один режим + vehicles)
  if (Array.isArray(draft.vehicles) && !draft.includeVehicles && !draft.excludeVehicles) {
    if (draft.mode === 'exclude') {
      return {
        ...empty,
        osgopContractNumber: draft.osgopContractNumber ?? '',
        clientName: draft.clientName ?? empty.clientName,
        osgopDate: draft.osgopDate ?? '',
        includeVehicles: [],
        excludeVehicles: draft.vehicles,
      }
    }
    return {
      ...empty,
      osgopContractNumber: draft.osgopContractNumber ?? '',
      clientName: draft.clientName ?? empty.clientName,
      osgopDate: draft.osgopDate ?? '',
      includeVehicles: draft.vehicles,
      excludeVehicles: [],
    }
  }

  return {
    osgopContractNumber: draft.osgopContractNumber ?? '',
    clientName: draft.clientName ?? empty.clientName,
    osgopDate: draft.osgopDate ?? '',
    includeVehicles: Array.isArray(draft.includeVehicles)
      ? draft.includeVehicles
      : empty.includeVehicles,
    excludeVehicles: Array.isArray(draft.excludeVehicles) ? draft.excludeVehicles : [],
  }
}

function loadForm(): void {
  const draft = loadDraft<unknown>(DRAFT_KEY)
  const legacyInclude = loadDraft<unknown>('contract-pwa:draft:osgop:include')
  const legacyExclude = loadDraft<unknown>('contract-pwa:draft:osgop:exclude')

  let next = normalizeLoadedDraft(draft)
  if (!draft && (legacyInclude || legacyExclude)) {
    const includePart = normalizeLoadedDraft(legacyInclude)
    const excludePart = normalizeLoadedDraft(legacyExclude)
    next = {
      osgopContractNumber:
        includePart.osgopContractNumber || excludePart.osgopContractNumber || '',
      clientName: includePart.clientName || excludePart.clientName || createEmptyOsgopForm().clientName,
      osgopDate: includePart.osgopDate || excludePart.osgopDate || '',
      includeVehicles: includePart.includeVehicles,
      excludeVehicles: excludePart.excludeVehicles.length
        ? excludePart.excludeVehicles
        : excludePart.includeVehicles,
    }
  }

  Object.assign(form, next)
  if (!form.osgopDate) form.osgopDate = todayIso()
  if (!form.osgopContractNumber.trim()) {
    form.osgopContractNumber = createEmptyOsgopForm().osgopContractNumber
  }
  errors.value = {}
}

onMounted(() => loadForm())

let saveTimer: number | undefined
watch(
  form,
  () => {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      const result = saveDraft(DRAFT_KEY, JSON.parse(JSON.stringify(form)))
      if (!result.ok && result.warned) draftWarning.value = true
    }, 400)
  },
  { deep: true },
)

function vehiclesOf(group: OsgopVehicleGroup): OsgopVehicleRow[] {
  return group === 'include' ? form.includeVehicles : form.excludeVehicles
}

function addVehicle(group: OsgopVehicleGroup): void {
  vehiclesOf(group).push(createVehicleRow())
}

function removeVehicle(group: OsgopVehicleGroup, index: number): void {
  vehiclesOf(group).splice(index, 1)
}

async function exportDocument(format: 'pdf' | 'docx'): Promise<void> {
  exportError.value = ''
  errors.value = validateOsgopForm(form)

  busy.value = format
  try {
    const model = toOsgopDocumentModel(form)
    const blob =
      format === 'pdf'
        ? await (await import('./export/osgop-pdf')).buildOsgopPdf(model)
        : await (await import('./export/osgop-docx')).buildOsgopDocx(model)
    const filename = `Zayavlenie_OSGOP_${formatFileDate(form.osgopDate)}.${format === 'pdf' ? 'pdf' : 'docx'}`
    downloadBlob(blob, filename)
  } catch (error) {
    exportError.value =
      error instanceof Error ? error.message : 'Не удалось сформировать документ'
  } finally {
    busy.value = null
  }
}

function clearForm(): void {
  if (!window.confirm('Очистить форму заявления и черновик?')) return
  Object.assign(form, createEmptyOsgopForm())
  form.osgopDate = todayIso()
  errors.value = {}
  clearDraft(DRAFT_KEY)
}
</script>

<template>
  <form class="form" @submit.prevent>
    <p v-if="draftWarning" class="banner warn">
      Автосохранение черновика недоступно (localStorage).
    </p>
    <p v-if="exportError" class="banner error">{{ exportError }}</p>
    <section class="card">
      <h2>Договор ОСГОП</h2>
      <div class="grid">
        <label>
          Номер договора ОСГОП
          <input v-model="form.osgopContractNumber" type="text" />
          <span v-if="errors.osgopContractNumber" class="err">{{ errors.osgopContractNumber }}</span>
        </label>
        <label>
          Дата включения/исключения
          <input v-model="form.osgopDate" type="date" />
          <span v-if="errors.osgopDate" class="err">{{ errors.osgopDate }}</span>
        </label>
        <label class="wide">
          Название клиента
          <input v-model="form.clientName" type="text" />
          <span v-if="errors.clientName" class="err">{{ errors.clientName }}</span>
        </label>
      </div>
    </section>

    <section class="card">
      <div class="row-head">
        <h2>Таб. 1 — Включение ТС</h2>
        <button type="button" class="ghost" @click="addVehicle('include')">+ Добавить ТС</button>
      </div>
      <p v-if="form.includeVehicles.length === 0" class="hint">Пока нет ТС для включения</p>
      <div
        v-for="(row, index) in form.includeVehicles"
        :key="row.id"
        class="vehicle-block"
      >
        <div class="row-head">
          <h3>Включение · ТС {{ index + 1 }}</h3>
          <button type="button" class="ghost" @click="removeVehicle('include', index)">Удалить</button>
        </div>
        <div class="grid">
          <label class="wide">
            Вид перевозок
            <select v-model="row.transportType">
              <option v-for="item in TRANSPORT_TYPES" :key="item" :value="item">{{ item }}</option>
              <option :value="CUSTOM_TRANSPORT_OPTION">{{ CUSTOM_TRANSPORT_OPTION }}</option>
            </select>
            <span v-if="errors[`include.${index}.transportType`]" class="err">
              {{ errors[`include.${index}.transportType`] }}
            </span>
          </label>
          <label v-if="row.transportType === CUSTOM_TRANSPORT_OPTION" class="wide">
            Свой вид перевозок
            <input v-model="row.customTransportType" type="text" />
          </label>
          <label class="wide">
            Марка и модель
            <input v-model="row.makeModel" type="text" />
            <span v-if="errors[`include.${index}.makeModel`]" class="err">
              {{ errors[`include.${index}.makeModel`] }}
            </span>
          </label>
          <label>
            ГРЗ
            <input v-model="row.plate" type="text" @blur="row.plate = normalizePlate(row.plate)" />
            <span v-if="errors[`include.${index}.plate`]" class="err">
              {{ errors[`include.${index}.plate`] }}
            </span>
          </label>
          <label>
            Пассажировместимость
            <input v-model="row.capacity" type="number" min="0" step="1" />
            <span v-if="errors[`include.${index}.capacity`]" class="err">
              {{ errors[`include.${index}.capacity`] }}
            </span>
          </label>
          <label>
            Посадочные места
            <input v-model="row.seats" type="number" min="0" step="1" />
            <span v-if="errors[`include.${index}.seats`]" class="err">
              {{ errors[`include.${index}.seats`] }}
            </span>
          </label>
          <label>
            Год выпуска
            <input v-model="row.year" type="number" min="1900" max="2100" />
            <span v-if="errors[`include.${index}.year`]" class="err">
              {{ errors[`include.${index}.year`] }}
            </span>
          </label>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="row-head">
        <h2>Таб. 2 — Исключение ТС</h2>
        <button type="button" class="ghost" @click="addVehicle('exclude')">+ Добавить ТС</button>
      </div>
      <p v-if="form.excludeVehicles.length === 0" class="hint">Пока нет ТС для исключения</p>
      <div
        v-for="(row, index) in form.excludeVehicles"
        :key="row.id"
        class="vehicle-block"
      >
        <div class="row-head">
          <h3>Исключение · ТС {{ index + 1 }}</h3>
          <button type="button" class="ghost" @click="removeVehicle('exclude', index)">Удалить</button>
        </div>
        <div class="grid">
          <label class="wide">
            Вид перевозок
            <select v-model="row.transportType">
              <option v-for="item in TRANSPORT_TYPES" :key="item" :value="item">{{ item }}</option>
              <option :value="CUSTOM_TRANSPORT_OPTION">{{ CUSTOM_TRANSPORT_OPTION }}</option>
            </select>
            <span v-if="errors[`exclude.${index}.transportType`]" class="err">
              {{ errors[`exclude.${index}.transportType`] }}
            </span>
          </label>
          <label v-if="row.transportType === CUSTOM_TRANSPORT_OPTION" class="wide">
            Свой вид перевозок
            <input v-model="row.customTransportType" type="text" />
          </label>
          <label class="wide">
            Марка и модель
            <input v-model="row.makeModel" type="text" />
            <span v-if="errors[`exclude.${index}.makeModel`]" class="err">
              {{ errors[`exclude.${index}.makeModel`] }}
            </span>
          </label>
          <label>
            ГРЗ
            <input v-model="row.plate" type="text" @blur="row.plate = normalizePlate(row.plate)" />
            <span v-if="errors[`exclude.${index}.plate`]" class="err">
              {{ errors[`exclude.${index}.plate`] }}
            </span>
          </label>
          <label>
            Пассажировместимость
            <input v-model="row.capacity" type="number" min="0" step="1" />
            <span v-if="errors[`exclude.${index}.capacity`]" class="err">
              {{ errors[`exclude.${index}.capacity`] }}
            </span>
          </label>
          <label>
            Посадочные места
            <input v-model="row.seats" type="number" min="0" step="1" />
            <span v-if="errors[`exclude.${index}.seats`]" class="err">
              {{ errors[`exclude.${index}.seats`] }}
            </span>
          </label>
          <label>
            Год выпуска
            <input v-model="row.year" type="number" min="1900" max="2100" />
            <span v-if="errors[`exclude.${index}.year`]" class="err">
              {{ errors[`exclude.${index}.year`] }}
            </span>
          </label>
        </div>
      </div>
    </section>

    <div class="actions">
      <button type="button" class="primary" :disabled="busy !== null" @click="exportDocument('pdf')">
        {{ busy === 'pdf' ? 'Формирую PDF…' : 'Скачать PDF' }}
      </button>
      <button type="button" class="primary" :disabled="busy !== null" @click="exportDocument('docx')">
        {{ busy === 'docx' ? 'Формирую DOCX…' : 'Скачать DOCX' }}
      </button>
      <button type="button" class="ghost" :disabled="busy !== null" @click="clearForm">Очистить форму</button>
    </div>
  </form>
</template>

<style scoped>
.vehicle-block {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.vehicle-block h3 {
  margin: 0;
  font-size: 0.98rem;
}

.hint {
  margin: 0;
  color: var(--muted);
}
</style>
