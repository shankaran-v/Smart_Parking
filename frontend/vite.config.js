import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }),
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  server: {
    port: 3000,
  },
  optimizeDeps: {
    include: ['react-toastify', 'axios', 'react-router-dom', 'react-icons', 'react-datetime-picker', 'react-phone-input-2', 'react-loader-spinner'],
    exclude: ['@react-google-maps/api']
  },
  define: {
    global: 'globalThis',
  },
  esbuild: {
    loader: 'jsx',
    include: /\.(js|jsx)$/
  }
})