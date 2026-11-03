import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages: /contract-pwa/ ; локально и preview: /
const base = process.env.VITE_BASE_PATH || '/'

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
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})

