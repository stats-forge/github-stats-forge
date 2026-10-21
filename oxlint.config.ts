import { baseConfig } from '@marcalexiei/oxlint-config/base';
import { nodeConfig } from '@marcalexiei/oxlint-config/node';
import { typescriptConfig } from '@marcalexiei/oxlint-config/typescript';
import { vitestConfig } from '@marcalexiei/oxlint-config/vitest';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [baseConfig, typescriptConfig],

  // `jsdoc` is off by default; only the tags this repo actually writes are checked.
  plugins: ['eslint', 'import', 'unicorn', 'typescript', 'jsdoc'],

  env: {
    browser: true,
    node: true,
  },

  ignorePatterns: [
    'packages/core/src/graphql/generated/**',
    // written by `astro sync`, and rewritten on every build
    'apps/docs/.astro/**',
  ],

  options: {
    reportUnusedDisableDirectives: 'error',
    typeAware: true,
  },

  rules: {
    // A doc block is a summary plus `@returns`; these keep the few tags honest without
    // asking for the `@param` list the signature already carries.
    'jsdoc/check-tag-names': 'error',
    'jsdoc/empty-tags': 'error',
    'jsdoc/no-blank-blocks': 'error',

    // ---------------------------------------------------------------------------
    // Tuned to what this repository is
    // ---------------------------------------------------------------------------

    // SVG attributes and coordinates, colour channels, comparator pairs, the `zod/mini`
    // namespace and the discarded argument are all single letters by convention.
    'id-length': [
      'error',
      {
        checkGeneric: false,
        exceptions: ['_', 'a', 'b', 'd', 'g', 'h', 'i', 'r', 't', 'v', 'w', 'x', 'y', 'z'],
        properties: 'never',
      },
    ],

    // `path` is already the name of what these functions take, so the module is imported by member.
    'unicorn/import-style': [
      'error',
      { extendDefaultStyles: true, styles: { 'node:path': { named: true } } },
    ],

    // A required parameter still has to be passed, so an explicit `undefined` argument is not useless.
    'unicorn/no-useless-undefined': ['error', { checkArguments: false }],

    // A param arrives off a query string, where `?title_color=` is empty, not absent,
    // so `||` is what falls back to the theme.
    'typescript/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true } }],

    // A `default` case is what covers the rest — the wakatime range is a plain `string`.
    'typescript/switch-exhaustiveness-check': [
      'error',
      { allowDefaultCaseForExhaustiveSwitch: true, considerDefaultExhaustiveForUnions: true },
    ],

    // ---------------------------------------------------------------------------
    // Off, each for a reason this repository owns
    // ---------------------------------------------------------------------------

    // A module exports next to what it defines, so its shape reads top to bottom.
    'import/exports-last': 'off',

    // `import * as z from 'zod/mini'` is how the library documents itself.
    'import/no-namespace': 'off',

    // The retryer's backoff, the paginated fetches and the CLI menu are sequential by design.
    'no-await-in-loop': 'off',

    // The layout and escaping loops read better skipping an item than nesting the rest.
    'no-continue': 'off',

    // The card layout picks a width or a label by chaining conditions; an if-chain hides that shape.
    'no-nested-ternary': 'off',

    // `Number()` is not the coercion these call sites perform: `parseFloat` is what keeps
    // `?border_radius=10px` rendering `rx="10"`.
    'unicorn/prefer-number-coercion': 'off',

    // Text is measured by code point, which is what spreading a string yields.
    'typescript/no-misused-spread': 'off',

    // Size limits the card renderers already exceed; splitting them is its own change.
    complexity: 'off',
    'max-depth': 'off',
    'max-lines': 'off',
    'max-lines-per-function': 'off',
    'max-params': 'off',
    'max-statements': 'off',
    'unicorn/max-nested-calls': 'off',
  },

  overrides: [
    {
      // `test` is in the glob so that a misnamed suite reaches `consistent-test-filename`,
      // which is what asks for `.spec`.
      files: ['**/*.{spec,test}.ts'],
      // Playwright names its files the same way, and vitest's rules do not describe it.
      excludeFiles: ['apps/docs/e2e/**'],
      ...vitestConfig,
      // Enabling `jest` alongside `vitest` reports every shared rule twice.
      plugins: ['vitest'],
      rules: {
        ...vitestConfig.rules,

        // A card test asserts on every node the card drew.
        'vitest/max-expects': 'off',

        // A file-level hook applies to every suite in the file; one wrapping `describe` only adds a level.
        'vitest/require-top-level-describe': 'off',

        // `vi.mock(import('…'))` already checks the factory against the module's own shape.
        'vitest/require-mock-type-parameters': 'off',

        // The rule counts the `?.` and `??` that `noUncheckedIndexedAccess` forces.
        'vitest/no-conditional-in-test': 'off',

        // The XSS suite and the top-languages card assert through a helper.
        'vitest/expect-expect': [
          'error',
          {
            assertFunctionNames: [
              'expect',
              'expectTypeOf',
              'assert',
              'assertType',
              'expectNoScript',
              'expectLabels',
            ],
          },
        ],
      },
    },
    {
      // The library must behave identically under Node, in the browser and under
      // vitest, so it configures nothing from ambient globals — the host passes a
      // `CardConfig` in. Tests are excluded: they legitimately use jsdom.
      files: ['packages/core/src/**/*.ts'],
      rules: {
        'no-restricted-globals': [
          'error',
          'process',
          'window',
          'document',
          'globalThis',
          'navigator',
        ],
      },
    },
    {
      // What ships never reaches into what tests it: a test helper is not built, published or typed for it.
      files: ['packages/*/src/**', 'apps/*/src/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/tests/**', '**/e2e/**'],
                message: 'Test helpers are for tests; move what src needs into src.',
              },
              {
                group: ['vitest', 'vitest/*', '@testing-library/*', '@playwright/test'],
                message: 'A test library is a dev dependency, absent wherever src runs.',
              },
            ],
          },
        ],
      },
    },
    {
      // oxlint parses an `.astro` frontmatter as TypeScript, where `Astro` is injected by the
      // compiler rather than declared.
      files: ['**/*.astro'],
      globals: { Astro: 'readonly' },
      rules: {
        // A stylesheet import is how a page asks for its own CSS, and there is nothing to assign.
        'import/no-unassigned-import': 'off',
      },
    },
    {
      // Importing a custom element registers it; the side effect *is* the import, and Web Awesome
      // exports nothing else from those modules.
      files: ['apps/docs/src/anvil/controls.ts'],
      rules: {
        'import/no-unassigned-import': 'off',
      },
    },
    {
      // Only these run on Node alone; core's sources also run in the browser.
      files: [
        '**/*.config.ts',
        'scripts/**',
        'apps/*/scripts/**',
        'packages/*/scripts/**',
        'apps/server/src/**',
        'packages/cli/src/**',
        'packages/cli/bin.js',
      ],
      ...nodeConfig,
    },
    {
      // A library must still load through `require(esm)`, which top-level await breaks; the CLI is an entry point.
      files: ['packages/core/src/**', 'packages/catalog/src/**'],
      plugins: ['node'],
      rules: {
        'node/no-top-level-await': 'error',
      },
    },
    {
      // The generators and the CLI report to the terminal; that is their output,
      // and a script that fails says so with an exit code.
      files: ['apps/*/scripts/**', 'scripts/**', 'packages/*/scripts/**', 'packages/cli/src/**'],
      rules: {
        'no-console': 'off',
        'unicorn/no-process-exit': 'off',
      },
    },
    {
      // This is the logger.
      files: ['packages/core/src/common/log.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // An ambient declaration file states a module's shape; it imports nothing itself.
      files: ['**/*.d.ts'],
      rules: {
        'import/unambiguous': 'off',
      },
    },
    {
      // Registering the jest-dom matchers is what this import is for.
      files: ['packages/core/tests/_setup.ts'],
      rules: {
        'import/no-unassigned-import': 'off',
      },
    },
    {
      // Running the built entry point is all the bin shim does.
      files: ['packages/cli/bin.js'],
      rules: {
        'import/no-unassigned-import': 'off',
      },
    },
  ],
});
