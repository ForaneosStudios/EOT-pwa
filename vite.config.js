import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Echoes of the Throne',
        short_name: 'EOT',
        description: 'Foro de la comunidad y seguimiento de logros',
        theme_color: '#1a202c',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // 1. ESTRATEGIA CACHE-FIRST (APP SHELL)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // 2. ESTRATEGIA NETWORK-FIRST (API)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/dominio-del-backend\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'foro-y-logros-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 días offline
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});