import { defineConfig } from 'vitest/config';

export default defineConfig({
  /*
   * The server reads core and the CLI's catalog through the `@stats/source` condition, which
   * vitest only applies when it is set under `ssr.resolve.conditions` as well as `resolve` —
   * the same trap `packages/cli/vitest.config.ts` documents.
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
