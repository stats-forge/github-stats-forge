import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/core/vitest.config.ts', 'packages/cli/vitest.config.ts'],
  },
  /*
   * Packages import each other through the `@stats/source` condition, so a test
   * run reads the other package's TypeScript rather than a possibly stale build.
   * Keep in sync with `tsconfig.base.json#customConditions`.
   */
  resolve: {
    conditions: ['@stats/source'],
  },
});
