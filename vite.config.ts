import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages: /contract-pwa/ ; локально и preview: /
const base = process.env.VITE_BASE_PATH || '/'

/** Копия index.html → 404.html для deep-link на GitHub Pages. */
function spaGithubPages404(): Plugin {
  return {
    name: 'spa-github-pages-404',
    closeBundle: {
      order: 'post',
      sequential: true,
      handler() {
        const outDir = fileURLToPath(new URL('./dist', import.meta.url))
        const indexPath = `${outDir}/index.html`
        const notFoundPath = `${outDir}/404.html`
        if (!existsSync(indexPath)) return
        copyFileSync(indexPath, notFoundPath)
      },
    },
  }
}

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // ЕГРЮЛ ФНС не отдаёт CORS — в dev ходим через прокси Vite
      '/api/egrul': {
        target: 'https://egrul.nalog.ru',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/egrul/, ''),
      },
    },
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // Регистрация SW прямо в index.html — не ждём загрузки Vue-бандла
      injectRegister: 'inline',
      // В dev SW мешает отладке (кеширует старый JS с пустым PDF)
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'offline.html', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Договоры ТС',
        short_name: 'Договоры',
        description: 'Офлайн заполнение договора аренды ТС и заявления ОСГОП',
        theme_color: '#1a2b3c',
        background_color: '#f4f6f8',
        display: 'standalone',
        lang: 'ru',
        start_url: './',
        scope: './',
        id: './',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Весь dist в precache — PDF/DOCX-чанки тоже доступны офлайн
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/./],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
    spaGithubPages404(),
  ],
})
