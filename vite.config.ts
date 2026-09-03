import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/serviceReminder/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    css: false,
  },
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'icons/pwa-192x192.png', 'icons/pwa-512x512.png'],
    manifest: {
      name: 'Nority - Avisos de agua',
      short_name: 'Nority',
      description: 'Avisos de cortes de agua del Acueducto de Bogotá',
      theme_color: '#c4e4f4',
      background_color: '#fdf3d6',
      display: 'standalone',
      lang: 'es',
      icons: [
        { src: '/serviceReminder/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: '/serviceReminder/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/serviceReminder/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/serviceReminder/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: 'index.html',
      globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
      cleanupOutdatedCaches: true,
    },
  })],
  server: {
    proxy: {
      '/api/acueducto': {
          target: 'https://www.acueducto.com.co',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/wps/portal/EAB2/Home/atencion-al-usuario/programacion_cortes/cortes+de+la+semana',
      },
    },
  },
})
