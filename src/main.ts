import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './style.css'

if (import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}

createApp(App).use(router).mount('#app')
