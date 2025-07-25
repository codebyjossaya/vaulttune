import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    noDiscovery: true,
    include: ['react','react-dom','react-google-button','react-dom/client']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    minify: false,
  },
  server: {
    port: 5174,
  }
})
