import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// Deploy estático (GitHub Pages em domínio próprio → base '/')
export default defineConfig({
  base: '/',
  plugins: [react(), tailwind()],
})
