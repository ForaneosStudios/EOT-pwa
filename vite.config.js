import { defineConfig, loadEnv } from 'vite';
import process from 'node:process';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = (env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
  const publicApiPattern = new RegExp(
    `^${escapeRegExp(apiBaseUrl)}/(?:categories|threads|posts)(?:/.*)?(?:\\?.*)?$`,
    'i',
  );

  return {
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
        
        // Only endpoints whose response does not depend on the authenticated
        // user are cached. Profiles, progress, hidden achievements and every
        // mutation remain network-only to prevent cross-session data leaks.
        runtimeCaching: [
          {
            urlPattern: publicApiPattern,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'eot-public-api-v1',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
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
  };
});
