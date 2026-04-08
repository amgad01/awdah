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
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000 ws://localhost:*; frame-ancestors 'none';",
    },
  },
});
