import { baseConfig } from '@marcalexiei/oxlint-config/base';
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

  ignorePatterns: ['packages/core/src/graphql/generated/**'],

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

    // A trailing note on the line it explains is this repo's style.
    'no-inline-comments': 'off',

    // The card layout picks a width or a label by chaining conditions; an if-chain hides that shape.
    'no-nested-ternary': 'off',
    'unicorn/no-nested-ternary': 'off',

    // `Number()` is not the coercion these call sites perform: `parseFloat` is what keeps
    // `?border_radius=10px` rendering `rx="10"`.
    'unicorn/prefer-number-coercion': 'off',

    // Text is measured by code point, which is what spreading a string yields.
    'typescript/no-misused-spread': 'off',

    // It flags every narrowing `as`, which is what the mock and parse boundaries use `as` for.
    'typescript/no-unsafe-type-assertion': 'off',

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
      files: ['**/*.{test,bench}.ts'],
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

        // Both contradict `prefer-strict-boolean-matchers`, which the suites follow.
        'vitest/prefer-to-be-falsy': 'off',
        'vitest/prefer-to-be-truthy': 'off',

        // The XSS suite asserts through a helper.
        'vitest/expect-expect': [
          'error',
          {
            assertFunctionNames: [
              'expect',
              'expectTypeOf',
              'assert',
              'assertType',
              'expectNoScript',
            ],
          },
        ],

        // The suites are named `*.test.ts`, not `*.spec.ts`.
        'vitest/consistent-test-filename': [
          'error',
          {
            pattern: String.raw`.*\.test\.[tj]sx?$`,
            allTestPattern: String.raw`.*\.(test|spec)\.[tj]sx?$`,
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
      // The generators and the CLI report to the terminal; that is their output,
      // and a script that fails says so with an exit code.
      files: ['examples/**', 'scripts/**', 'packages/*/scripts/**', 'packages/cli/src/**'],
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
  ],
});
