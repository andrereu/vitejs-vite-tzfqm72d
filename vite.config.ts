/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Testes de hoje são só funções puras (sem tela) — 'node' é suficiente
    // e mais rápido que simular um navegador (jsdom). Se no futuro surgirem
    // testes de componente, troque para 'jsdom'.
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
