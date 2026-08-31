import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ConveyWeb',
      fileName: 'convey-web',
      formats: ['es'],
    },
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
  },
})
