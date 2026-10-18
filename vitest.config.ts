import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // a project does not inherit this file, so each sets the `@stats/source` condition it needs
    projects: [
      'packages/core/vitest.config.ts',
      'packages/catalog/vitest.config.ts',
      'packages/cli/vitest.config.ts',
      'apps/server/vitest.config.ts',
    ],
  },
});
