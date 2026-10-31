import { defineConfig, mergeConfig } from 'vitest/config';

import root from './vitest.config.ts';

export default mergeConfig(
  root,
  defineConfig({
    test: {
      coverage: {
        enabled: true,
        // every source file, so one no test imports counts as uncovered rather than unseen
        include: ['packages/*/src/**/*.ts', 'apps/server/src/**/*.ts'],
        // run only as processes: `index.ts` by CI's `image` job, `healthcheck.ts` by Docker alone
        exclude: ['apps/server/src/index.ts', 'apps/server/src/healthcheck.ts'],
        // floors just under what each package reaches, so a drop fails CI
        thresholds: {
          'packages/core/src/**': { lines: 97, statements: 97, functions: 98, branches: 90 },
          'packages/catalog/src/**': { lines: 100, statements: 100, functions: 100 },
          'packages/cli/src/**': { lines: 40, statements: 40, functions: 50, branches: 27 },
          'apps/server/src/**': { lines: 98, statements: 98, functions: 97, branches: 93 },
        },
      },
    },
  }),
);
