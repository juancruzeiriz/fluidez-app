import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages sirve el sitio bajo /fluidez-app/
export default defineConfig({
  base: '/fluidez-app/',
  plugins: [
    react(),
    VitePWA({
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        // La API de Anthropic nunca se cachea
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
} as Parameters<typeof defineConfig>[0]);
