import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages sirve el sitio bajo /fluidez-app/
export default defineConfig({
  base: '/fluidez-app/',
  build: {
    rollupOptions: {
      output: {
        // Separa las dependencias pesadas del chunk principal: la app arranca
        // sin esperar recharts (solo Progreso) ni supabase (solo sync).
        manualChunks: {
          recharts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      // SW propio (src/sw.ts): precaching + recordatorio por periodic sync.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: 'script', // registro en archivo aparte (compatible con la CSP)
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Fluidez — entrenador de expresión oral',
        short_name: 'Fluidez',
        description: 'Entrenamiento diario de fluidez verbal basado en evidencia',
        lang: 'es',
        start_url: '/fluidez-app/',
        scope: '/fluidez-app/',
        display: 'standalone',
        background_color: '#0f1117',
        theme_color: '#0f1117',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
} as Parameters<typeof defineConfig>[0]);
