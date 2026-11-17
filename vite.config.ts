import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        useCredentials: true,
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'apple-touch-icon-v7.png',
          'apple-touch-icon-180-v7.png',
          'pwa-icon-192-v7.png',
          'pwa-icon-512-v7.png',
          'pwa-icon-maskable-512-v7.png',
        ],
        manifest: {
          id: '/',
          name: 'Gestão Manutenção',
          short_name: 'Gestão Manutenção',
          description:
            'Sistema de Checklist, Ordens de Serviço, Frota e Manutenção Operacional do Grupo el Ciruelo.',
          theme_color: '#065f46',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-icon-192-v7.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-icon-512-v7.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-icon-maskable-512-v7.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          navigateFallback: null,
          globPatterns: ['**/*.{js,css,ico,png,jpg,svg,woff,woff2}'],
          globIgnores: [
            '**/index.html',
            '**/manifest.webmanifest',
            '**/assets/aistudio/transferir*',
            '**/assets/aistudio/a2e9e992*',
          ],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({request}) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-pages-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [200],
                },
              },
            },
            {
              urlPattern: /\/manifest\.webmanifest$/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'manifest-cache',
                networkTimeoutSeconds: 3,
                cacheableResponse: {
                  statuses: [200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
