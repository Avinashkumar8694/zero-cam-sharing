import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // the packaged desktop app opens dist/index.html from disk (file://): its assets need relative paths there; the website and the Android app keep '/'
  base: process.env.ELECTRON === '1' ? './' : '/',
  plugins: [react(), tailwindcss()],
})
