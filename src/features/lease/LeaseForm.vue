<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { clearDraft, loadDraft, saveDraft } from '@/features/shared/lib/draft'
import { downloadBlob } from '@/features/shared/lib/download'
import { formatFileDate, todayIso } from '@/features/shared/lib/dates'
import { lookupCompanyByInn } from '@/features/shared/lib/egrul'
import { normalizePlate, plateForFilename } from '@/features/shared/lib/plate'
import { toGenitiveFullName } from '@/features/shared/lib/name'
import { fileToStampDataUrl } from '@/features/shared/lib/stamp-image'
import { asTrimmedString } from '@/features/shared/lib/string'
import { TENANT } from '@/features/shared/constants/tenant'
import { resolveLandlordStampDataUrl, toLeaseDocumentModel } from './export/lease-model'
import {
  createEmptyLeaseForm,
  type LandlordType,
  type LeaseErrors,
  type LeaseFormState,
} from './types'
import { validateLeaseForm } from './validation'

const DRAFT_KEY = 'contract-pwa:draft:lease' as const

const form = reactive<LeaseFormState>(createEmptyLeaseForm())
const errors = ref<LeaseErrors>({})
const draftWarning = ref(false)
const busy = ref<'pdf' | 'docx' | null>(null)
const exportError = ref('')
const innBusy = ref(false)
const innMessage = ref('')
const innError = ref('')
const stampError = ref('')
const stampInputKey = ref(0)

const contractNumber = computed(() => normalizePlate(form.plate))
const stampPreviewUrl = computed(() => resolveLandlordStampDataUrl(form))
const hasCustomStamp = computed(() => Boolean(asTrimmedString(form.landlordStampDataUrl)))

onMounted(() => {
  const draft = loadDraft<Partial<LeaseFormState>>(DRAFT_KEY)
  if (draft) Object.assign(form, createEmptyLeaseForm(), draft)
  if (!form.contractDate) form.contractDate = todayIso()
  if (form.landlordType !== 'fl' && form.landlordType !== 'ul') {
    form.landlordType = 'fl'
  }
})

let saveTimer: number | undefined
watch(
  form,
  () => {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      const result = saveDraft(DRAFT_KEY, { ...form })
      if (!result.ok && result.warned) draftWarning.value = true
    }, 400)
  },
  { deep: true },
)

function setLandlordType(type: LandlordType): void {
  form.landlordType = type
  innMessage.value = ''
  innError.value = ''
  // Печать только для ЮЛ — при переключении на ФЛ сбрасываем файл и ошибку.
  if (type !== 'ul') {
    form.landlordStampDataUrl = ''
    stampError.value = ''
    stampInputKey.value += 1
  }
}

function fieldError(key: string): string | undefined {
  return errors.value[key]
}

async function fillByInn(): Promise<void> {
  innMessage.value = ''
  innError.value = ''
  innBusy.value = true
  try {
    const company = await lookupCompanyByInn(form.companyInn)
    form.companyInn = company.inn
    form.companyName = company.companyName
    form.companyOgrn = company.ogrn
    form.companyKpp = company.kpp
    form.directorNameNominative = company.directorName
    form.directorName = toGenitiveFullName(company.directorName)
    form.directorPosition = company.directorPosition
    if (!asTrimmedString(form.companyAddress) && company.region) {
      form.companyAddress = company.region
    }
    if (!asTrimmedString(form.directorBasis)) {
      form.directorBasis = 'Устава'
    }
    innMessage.value =
      'Данные подставлены из ЕГРЮЛ. ФИО руководителя приведено к родительному падежу — проверьте адрес и формулировку.'
  } catch (error) {
    innError.value =
      error instanceof Error ? error.message : 'Не удалось получить данные по ИНН'
  } finally {
    innBusy.value = false
  }
}

async function exportDocument(format: 'pdf' | 'docx'): Promise<void> {
  exportError.value = ''
  errors.value = validateLeaseForm(form)

  busy.value = format
  try {
    const model = toLeaseDocumentModel(form)
    const blob =
      format === 'pdf'
        ? await (await import('./export/lease-pdf')).buildLeasePdf(model)
        : await (await import('./export/lease-docx')).buildLeaseDocx(model)
    const filename = `Dogovor_${plateForFilename(form.plate)}_${formatFileDate(form.contractDate)}.${format === 'pdf' ? 'pdf' : 'docx'}`
    downloadBlob(blob, filename)
  } catch (error) {
    exportError.value =
      error instanceof Error ? error.message : 'Не удалось сформировать документ'
  } finally {
    busy.value = null
  }
}

async function onStampSelected(event: Event): Promise<void> {
  stampError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    form.landlordStampDataUrl = await fileToStampDataUrl(file)
  } catch (error) {
    stampError.value =
      error instanceof Error ? error.message : 'Не удалось загрузить печать'
    form.landlordStampDataUrl = ''
  }
}

function clearStamp(): void {
  form.landlordStampDataUrl = ''
  stampError.value = ''
  stampInputKey.value += 1
}

function clearForm(): void {
  if (!window.confirm('Очистить форму договора и черновик?')) return
  const landlordType = form.landlordType
  Object.assign(form, createEmptyLeaseForm())
  form.landlordType = landlordType
  form.contractDate = todayIso()
  errors.value = {}
  innMessage.value = ''
  innError.value = ''
  stampError.value = ''
  stampInputKey.value += 1
  clearDraft(DRAFT_KEY)
}
</script>

<template>
  <form class="form" @submit.prevent>
    <p v-if="draftWarning" class="banner warn">
      Автосохранение черновика недоступно (localStorage). Данные сохранятся только до закрытия вкладки.
    </p>
    <p v-if="exportError" class="banner error">{{ exportError }}</p>

    <section class="card">
      <h2>Тип арендодателя</h2>
      <div class="mode-switch">
        <button
          type="button"
          :class="{ active: form.landlordType === 'fl' }"
          @click="setLandlordType('fl')"
        >
          Физлицо (ФЛ)
        </button>
        <button
          type="button"
          :class="{ active: form.landlordType === 'ul' }"
          @click="setLandlordType('ul')"
        >
          Юрлицо (ЮЛ)
        </button>
      </div>
    </section>

    <section class="card">
      <h2>Договор и даты</h2>
      <div class="grid">
        <label>
          ГРЗ (номер договора)
          <input
            v-model="form.plate"
            type="text"
            autocomplete="off"
            @blur="form.plate = normalizePlate(form.plate)"
          />
          <span class="hint">№ договора: {{ contractNumber || '—' }}</span>
          <span v-if="fieldError('plate')" class="err">{{ fieldError('plate') }}</span>
        </label>
        <label>
          Дата договора
          <input v-model="form.contractDate" type="date" />
        </label>
        <label>
          Срок аренды с
          <input v-model="form.rentFrom" type="date" />
        </label>
        <label>
          Срок аренды по
          <input v-model="form.rentTo" type="date" />
        </label>
        <label>
          Цена, руб/сутки (п. 3.1.1)
          <input v-model="form.dailyPrice" type="number" min="1" step="1" />
        </label>
      </div>
    </section>

    <section v-if="form.landlordType === 'fl'" class="card">
      <h2>Арендодатель (ФЛ)</h2>
      <div class="grid">
        <label class="wide">
          ФИО
          <input v-model="form.landlordFullName" type="text" />
        </label>
        <label>
          Дата рождения
          <input v-model="form.landlordBirthDate" type="date" />
        </label>
        <label class="wide">
          Адрес регистрации
          <input v-model="form.landlordAddress" type="text" />
        </label>
      </div>
    </section>

    <section v-else class="card">
      <h2>Арендодатель (ЮЛ)</h2>
      <div class="grid">
        <label>
          ИНН
          <input v-model="form.companyInn" type="text" inputmode="numeric" maxlength="12" />
        </label>
        <div class="inn-actions">
          <button type="button" class="primary" :disabled="innBusy" @click="fillByInn">
            {{ innBusy ? 'Ищу в ЕГРЮЛ…' : 'Заполнить по ИНН' }}
          </button>
          <span class="hint">Нужен интернет. Адрес из выписки уточните вручную.</span>
        </div>
        <p v-if="innMessage" class="banner warn wide">{{ innMessage }}</p>
        <p v-if="innError" class="banner error wide">{{ innError }}</p>
        <label class="wide">
          Название организации
          <input v-model="form.companyName" type="text" />
        </label>
        <label>
          ОГРН
          <input v-model="form.companyOgrn" type="text" />
        </label>
        <label>
          КПП
          <input v-model="form.companyKpp" type="text" />
        </label>
        <label class="wide">
          Юридический адрес
          <input v-model="form.companyAddress" type="text" />
        </label>
        <label class="wide">
          В лице (должность в род. падеже)
          <input v-model="form.directorPosition" type="text" placeholder="генерального директора" />
        </label>
        <label class="wide">
          ФИО руководителя (в договоре — родительный падеж)
          <input v-model="form.directorName" type="text" />
          <span class="hint">Подставляется автоматически из ЕГРЮЛ в родительном падеже.</span>
        </label>
        <label>
          На основании
          <input v-model="form.directorBasis" type="text" placeholder="Устава" />
        </label>
      </div>
    </section>

    <section class="card">
      <h2>Транспортное средство</h2>
      <div class="grid">
        <label class="wide">
          Марка и модель
          <input v-model="form.vehicleMakeModel" type="text" />
        </label>
        <label>
          VIN
          <input v-model="form.vin" type="text" />
        </label>
        <label>
          Год выпуска
          <input v-model="form.year" type="number" min="1900" max="2100" />
        </label>
        <label>
          Цвет
          <input v-model="form.color" type="text" />
        </label>
        <label>
          Тип двигателя
          <input v-model="form.engineType" type="text" />
        </label>
        <label>
          СТС
          <input v-model="form.sts" type="text" />
        </label>
        <label>
          ПТС
          <input v-model="form.pts" type="text" />
        </label>
      </div>
    </section>

    <section class="card muted">
      <h2>Арендатор (фиксировано)</h2>
      <p>{{ TENANT.fullName }}</p>
      <p>ОГРНИП {{ TENANT.ogrnip }}, ИНН {{ TENANT.inn }}</p>
      <p>{{ TENANT.address }}</p>
    </section>

    <section v-if="form.landlordType === 'ul'" class="card">
      <h2>Печать арендодателя</h2>
      <p class="hint">
        Печать собирается автоматически из реквизитов организации и ставится у подписи.
        При желании можно заменить своим файлом.
      </p>
      <div v-if="stampPreviewUrl" class="stamp-preview">
        <img :src="stampPreviewUrl" alt="Превью печати" />
        <div class="stamp-meta">
          <span class="hint">{{ hasCustomStamp ? 'Своя печать (файл)' : 'Автогенерация по данным формы' }}</span>
          <button v-if="hasCustomStamp" type="button" class="ghost" @click="clearStamp">
            Вернуть автопечать
          </button>
        </div>
      </div>
      <p v-else class="hint">Заполните данные организации — появится превью печати.</p>
      <label class="wide">
        Заменить своей печатью (необязательно)
        <input
          :key="stampInputKey"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
          @change="onStampSelected"
        />
      </label>
      <p v-if="stampError" class="banner error">{{ stampError }}</p>
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
.inn-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: end;
}

.wide {
  grid-column: 1 / -1;
}

.stamp-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
  min-width: 0;
}

.stamp-preview img {
  width: min(160px, 100%);
  max-height: 160px;
  object-fit: contain;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  padding: 6px;
}

.stamp-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1 1 12rem;
}
</style>
