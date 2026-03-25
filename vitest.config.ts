import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/backend/vitest.config.ts',
      'apps/frontend/vitest.config.ts',
      'packages/shared/vitest.config.ts',
    ],
  },
});
