import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Standalone Vue micro-frontend for the immersive chat experience.
// Runs on :3001 in dev and is embedded full-bleed via <iframe> inside
// the explorer (Next.js) shell's "chat" tab — see
// apps/explorer/src/components/chat/ChatEmbed.tsx.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3001,
    strictPort: true,
    // Allow being framed by the explorer app's iframe in dev.
    headers: {
      'X-Frame-Options': 'ALLOWALL',
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          markdown: ['marked', 'dompurify', 'highlight.js'],
        },
      },
    },
  },
})
