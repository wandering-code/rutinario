import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'
import { resolve } from 'path'

// Sello de versión visible en Ajustes: con el service worker de la PWA de por
// medio, un móvil puede quedarse en una versión vieja sin que se note.
function selloDeVersion() {
  try {
    const hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    const sucio = execSync('git status --porcelain').toString().trim() ? '+' : ''
    return `${hash}${sucio}`
  } catch {
    return 'sin-git'
  }
}

// En producción nginx hace lo mismo: /api → backend (quitando el prefijo) y
// /uploads → backend tal cual.
const PROXY = {
  '/api': { target: 'http://localhost:8007', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
  '/uploads': { target: 'http://localhost:8007', changeOrigin: true },
}

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(selloDeVersion()),
    __FECHA_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  resolve: { alias: { '@': resolve(__dirname, './src') } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        id: '/',
        name: 'Rutinario',
        short_name: 'Rutinario',
        description: 'Diseña rutinas de entrenamiento y expórtalas.',
        scope: '/',
        start_url: '/',
        // En el ordenador se abre como ventana propia, sin barra del navegador.
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        background_color: '#f3f1ec',
        theme_color: '#f3f1ec',
        lang: 'es',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Rutinas', url: '/' },
          { name: 'Ejercicios', url: '/ejercicios' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Los datos son vivos: nunca desde la caché del shell.
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
        // Las imágenes de ejercicios sí: cada nombre es siempre el mismo archivo.
        runtimeCaching: [{
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/uploads/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'rutinario-imagenes',
            expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [200] },
          },
        }],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { host: '0.0.0.0', port: 5180, proxy: PROXY },
  preview: { host: '0.0.0.0', port: 5181, proxy: PROXY },
})
