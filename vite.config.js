import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/**'],
      manifest: {
        name: 'Jeebi',
        short_name: 'Jeebi',
        description: 'مدير المصاريف الذكي',
        start_url: '/?v=2',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#7c3aed',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icons/96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: true,
  },
})
