import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/serviceReminder/',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg'],
    manifest: {
      name: 'Nority - Avisos de agua',
      short_name: 'Nority',
      description: 'Avisos de cortes de agua del Acueducto de Bogotá',
      theme_color: '#c4e4f4',
      background_color: '#fdf3d6',
      display: 'standalone',
      lang: 'es',
      icons: [{ src: '/serviceReminder/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
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
