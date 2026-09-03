import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 uses the dedicated Vite plugin — no tailwind.config.js / postcss.config.js needed.
// GitHub Pages 프로젝트 사이트는 https://<user>.github.io/<repo>/ 하위 경로에서 서빙됨.
// 배포 워크플로가 VITE_BASE=/<repo>/ 를 주입하면 그 값으로 base 설정, 로컬 dev/build 는 '/'.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
})
