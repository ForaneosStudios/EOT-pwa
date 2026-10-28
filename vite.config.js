import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Echoes of the Throne',
        short_name: 'EOT',
        description: 'Foro de la comunidad y seguimiento de logros',
        lang: 'es',
        theme_color: '#0C0808',
        background_color: '#0C0808',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // 1. ESTRATEGIA CACHE-FIRST (APP SHELL)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // API responses are network-only to prevent cross-session data leaks.
        runtimeCaching: [
          // 3. FUENTES DE GOOGLE: para que Cinzel e Inter carguen offline
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
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
