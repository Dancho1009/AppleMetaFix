import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    build: {
      lib: {
        entry: 'src/main/preload.ts',
        formats: ['cjs'],
        fileName: () => 'preload',
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [react()],
  },
})
