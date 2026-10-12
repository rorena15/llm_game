import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tauri: 고정 포트, Rust 빌드 폴더는 감시하지 않는다
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
