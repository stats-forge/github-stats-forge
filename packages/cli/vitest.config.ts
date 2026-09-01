import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    include: ['./tests/*.test.ts'],
  },
  /*
   * Read core's TypeScript rather than its build, so a stale `build/` cannot
   * pass or fail a test. Vitest resolves through the ssr graph, hence both.
   * Keep the condition in sync with `tsconfig.base.json#customConditions`.
   */
  resolve: {
    conditions: ['@stats/source'],
  },
  ssr: {
    resolve: {
      conditions: ['@stats/source'],
    },
  },
});
