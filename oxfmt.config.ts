import { oxfmtConfig } from '@marcalexiei/oxfmt-config';

// Auto-discovered by name. `.oxfmtrc.ts` is not — only `.oxfmtrc.{json,jsonc}` and this one.
const config = {
  ...oxfmtConfig,
  // oxfmt already skips lock files, but the rule is spelled out so it survives that default changing.
  ignorePatterns: ['pnpm-lock.yaml'],
  overrides: [
    {
      // JSONC readers vary on trailing commas, so they stay out of hand-edited config.
      files: ['*.jsonc'],
      options: { trailingComma: 'none' },
    },
  ],
};

export default config;
