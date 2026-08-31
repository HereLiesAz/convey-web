import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      // Two entry points, not one: the kinetic-typography subsystem carries ~11.5MB of
      // WordNet-derived data assets (see src/kinetic/data/README.md) that the rest of this
      // package's consumers should never pay for unless they actually import it. Vite's
      // library mode code-splits automatically across multiple entries in ES format, so
      // shared modules (tokens, grammar, life, etc.) still ship once, not duplicated.
      entry: {
        'convey-web': resolve(__dirname, 'src/index.ts'),
        kinetic: resolve(__dirname, 'src/kinetic/index.ts'),
      },
      name: 'ConveyWeb',
      formats: ['es'],
    },
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
  },
})
