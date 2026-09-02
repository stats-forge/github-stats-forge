import { fileURLToPath } from 'node:url';

import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import {
  createTypeScriptImportResolver,
  defaultConditionNames,
} from 'eslint-import-resolver-typescript';
import { importX } from 'eslint-plugin-import-x';
import { default as jsdoc } from 'eslint-plugin-jsdoc';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import { default as tseslint } from 'typescript-eslint';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default defineConfig(
  includeIgnoreFile(gitignorePath, 'Imported .gitignore patterns'),
  {
    name: 'Generated GraphQL types',
    ignores: ['packages/core/src/graphql/generated/**'],
  },
  js.configs.recommended,

  {
    extends: [importX.flatConfigs.recommended, importX.flatConfigs.typescript],
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          conditionNames: [
            /** Keep in sync with `tsconfig.base.json#customConditions` */
            '@stats/source',

            ...defaultConditionNames,
          ],
        }),
      ],
    },
    rules: {
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      // Import order belongs to oxfmt's `sortImports` now.
      // The two disagreed on case (`color.js` vs `I18n.js`), so every format run re-broke lint.
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      jsdoc,
    },
    rules: {
      'no-unexpected-multiline': 'error',
      'accessor-pairs': [
        'error',
        {
          getWithoutSet: false,
          setWithoutGet: true,
        },
      ],
      'block-scoped-var': 'warn',
      'consistent-return': 'error',
      curly: 'error',
      'no-alert': 'error',
      'no-caller': 'error',
      'no-warning-comments': [
        'warn',
        {
          terms: ['TODO', 'FIXME'],
          location: 'start',
        },
      ],
      'no-with': 'warn',
      radix: 'warn',
      'no-delete-var': 'error',
      'no-undef-init': 'off',
      'no-undef': 'error',
      'no-undefined': 'off',
      'no-unused-vars': 'warn',
      'no-use-before-define': 'error',
      'constructor-super': 'error',
      'no-class-assign': 'error',
      'no-const-assign': 'error',
      'no-dupe-class-members': 'error',
      'no-this-before-super': 'error',
      'object-shorthand': ['warn'],
      'no-mixed-spaces-and-tabs': 'warn',
      'no-negated-condition': 'warn',
      'no-unneeded-ternary': 'warn',
      'keyword-spacing': [
        'error',
        {
          before: true,
          after: true,
        },
      ],
      'jsdoc/require-returns': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-jsdoc': 'warn',
    },
  },
  {
    files: ['**/*.{d.ts,ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylistic],
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowAny: false,
          allowBoolean: true, // for query parameters
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
        },
      ],

      // Keep `@param props.x` doc names in sync with the destructured
      // parameters so they cannot silently drift on rename.
      'jsdoc/check-param-names': 'error',

      // We don't need this we have typescript
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-jsdoc': 'off',
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
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
    // `scripts/` and the package's own generators run under Node.
    files: ['scripts/**/*.{js,ts}', 'packages/*/scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
