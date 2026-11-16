<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { clearAllPersonalData } from '@/features/shared/lib/secure-storage'

const clearing = ref(false)
const clearMessage = ref('')

async function onClearPersonalData(): Promise<void> {
  if (
    !window.confirm(
      'Удалить с этого устройства все черновики и историю арендодателей? Действие необратимо.',
    )
  ) {
    return
  }
  clearing.value = true
  clearMessage.value = ''
  try {
    await clearAllPersonalData()
    clearMessage.value = 'Персональные данные на устройстве удалены'
  } catch {
    clearMessage.value = 'Не удалось полностью очистить данные — попробуйте ещё раз'
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <section class="home">
    <h1>Договоры ТС</h1>
    <p class="lead">
      Офлайн-заполнение договора аренды и заявления ОСГОП. Данные остаются на этом устройстве и
      хранятся в зашифрованном виде.
    </p>
    <div class="home-actions">
      <RouterLink class="tile" to="/lease">
        <strong>Договор аренды ТС</strong>
        <span>Без экипажа · PDF / DOCX</span>
      </RouterLink>
      <RouterLink class="tile" to="/osgop">
        <strong>Заявление ОСГОП</strong>
        <span>Включение / исключение ТС · PDF / DOCX</span>
      </RouterLink>
    </div>

    <section class="privacy">
      <h2>Конфиденциальность</h2>
      <p>
        Черновики и история арендодателей шифруются на устройстве (AES-GCM). На сервер ничего не
        отправляется, кроме запроса реквизитов по ИНН при нажатии кнопки.
      </p>
      <button type="button" class="ghost" :disabled="clearing" @click="onClearPersonalData">
        {{ clearing ? 'Удаляю…' : 'Удалить все персональные данные' }}
      </button>
      <p v-if="clearMessage" class="hint">{{ clearMessage }}</p>
    </section>
  </section>
</template>

<style scoped>
.privacy {
  margin-top: 28px;
  padding-top: 8px;
}

.privacy h2 {
  margin: 0 0 8px;
  font-size: 1.05rem;
}

.privacy p {
  margin: 0 0 12px;
  color: var(--muted);
  max-width: 42rem;
}

.hint {
  margin-top: 10px;
  color: var(--muted);
  font-size: 0.85rem;
}
</style>
