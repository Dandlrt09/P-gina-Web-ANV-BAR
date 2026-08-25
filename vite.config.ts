/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Pure domain-logic tests run in plain node; component tests (jsdom)
    // can opt in later via per-file comment when needed.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
