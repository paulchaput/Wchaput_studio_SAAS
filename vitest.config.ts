import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Mock server-only so pure helper unit tests can import server modules
      // without the Next.js runtime enforcement throwing an error.
      'server-only': path.resolve(__dirname, './__mocks__/server-only.ts'),
    },
  },
})
