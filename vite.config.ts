import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const base = env.VITE_BASE_PATH || '/'

  if (!base.startsWith('/') || !base.endsWith('/') || /[?#\\]/.test(base)) {
    throw new Error('VITE_BASE_PATH must be an absolute path with leading and trailing slashes.')
  }

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        // Updates wait until all app windows close; never reload an active workout.
        registerType: 'prompt',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: base,
          name: 'Reverse Ladders',
          short_name: 'Ladders',
          description: 'Remember your progression. Train at your own pace.',
          start_url: base,
          scope: base,
          display: 'standalone',
          theme_color: '#3d7155',
          background_color: '#f6f7f5',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  }
})
