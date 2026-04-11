import { defineConfig } from 'vite';
import path from 'path';

const apiTarget =
  process.env.VITE_API_BASE_URL || process.env.VITE_API_URL || 'http://localhost:3000';

// VITE_BASE_PATH controls the deployment base.
//   /       → CloudFront / same-origin (default)
//   /awdah/ → GitHub Pages (repo name must match)
const basePath = process.env.VITE_BASE_PATH || '/';

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'chart-vendor';
          }
          if (id.includes('node_modules/swiper')) {
            return 'swiper-vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    proxy: {
      '/v1': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'sha256-Met0FLFVqROiq/jDyYtlhInoFysISzTul6sZrG/Vad0=' 'sha256-dqXIySKK46KsKOsprg2Grne7/9CQTTLSO9NqASQ/3O4='; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: http://localhost:* ws://localhost:*; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';",
    },
  },
});
