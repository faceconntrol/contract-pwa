<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const offlineReady = ref(false)
const showReadyHint = ref(false)

const statusKind = computed(() => {
  if (!online.value) return 'offline' as const
  if (!offlineReady.value && import.meta.env.PROD) return 'caching' as const
  if (showReadyHint.value) return 'ready' as const
  return 'none' as const
})

function syncOnline(): void {
  online.value = navigator.onLine
}

async function waitForServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
    offlineReady.value = !import.meta.env.PROD
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        const onController = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', onController)
          resolve()
        }
        navigator.serviceWorker.addEventListener('controllerchange', onController)
        window.setTimeout(resolve, 5000)
      })
    }
    offlineReady.value = Boolean(registration.active)
    if (offlineReady.value) {
      showReadyHint.value = true
      window.setTimeout(() => {
        showReadyHint.value = false
      }, 6000)
    }
  } catch {
    offlineReady.value = false
  }
}

onMounted(() => {
  window.addEventListener('online', syncOnline)
  window.addEventListener('offline', syncOnline)
  void waitForServiceWorker()
})

onUnmounted(() => {
  window.removeEventListener('online', syncOnline)
  window.removeEventListener('offline', syncOnline)
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/">Договоры ТС</RouterLink>
      <nav>
        <RouterLink to="/lease">Договор</RouterLink>
        <RouterLink to="/osgop">ОСГОП</RouterLink>
      </nav>
    </header>

    <p v-if="statusKind === 'offline'" class="banner warn status-banner">
      Офлайн-режим — документы собираются на устройстве
    </p>
    <p v-else-if="statusKind === 'caching'" class="banner warn status-banner">
      Сохраняем приложение для офлайн… Подождите несколько секунд с интернетом
    </p>
    <p v-else-if="statusKind === 'ready'" class="banner ok status-banner">
      Готово: можно работать без интернета
    </p>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.status-banner {
  margin: 0 0 12px;
}
</style>
