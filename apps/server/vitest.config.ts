import { defineConfig } from 'vitest/config';

export default defineConfig({
  /*
   * The server reads core and the catalog through the `@github-stats-forge/source` condition, which
   * vitest only applies when it is set under `ssr.resolve.conditions` as well as `resolve` —
   * the same trap `packages/cli/vitest.config.ts` documents.
   */
  resolve: {
    conditions: ['@github-stats-forge/source'],
  },
  ssr: {
    resolve: {
      conditions: ['@github-stats-forge/source'],
    },
  },
});
