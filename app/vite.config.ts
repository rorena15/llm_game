import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tauriConf from './src-tauri/tauri.conf.json'

// Tauri: 고정 포트, Rust 빌드 폴더는 감시하지 않는다
export default defineConfig({
  plugins: [react()],
  // 앱 버전의 원본은 tauri.conf.json (새 버전 알림에 쓴다)
  define: { __APP_VERSION__: JSON.stringify(tauriConf.version) },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
