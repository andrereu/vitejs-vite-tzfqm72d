/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Atualiza o app sozinho em segundo plano quando sai uma versão nova —
      // sem isso, o service worker pode "prender" a paciente numa versão
      // antiga do app depois de instalado.
      registerType: 'autoUpdate',
      manifest: {
        name: 'MaternaIA - Carteirinha Pré-Natal Digital',
        short_name: 'MaternaIA',
        description: 'Plataforma de acompanhamento de pré-natal e carteirinha digital para gestantes e obstetras.',
        theme_color: '#2E482A',
        background_color: '#F4F6F2',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  test: {
    // Testes de hoje são só funções puras (sem tela) — 'node' é suficiente
    // e mais rápido que simular um navegador (jsdom). Se no futuro surgirem
    // testes de componente, troque para 'jsdom'.
    environment: 'node',
    // 'api/**' incluído a partir da UX-05.2: a montagem do prompt do Gemini
    // (api/_lib/examPromptConfig.ts) também é função pura, testável sem
    // Firestore nem rede — mesmo critério que já vale para src/utils.
    include: ['src/**/*.test.ts', 'api/**/*.test.ts']
  }
})
