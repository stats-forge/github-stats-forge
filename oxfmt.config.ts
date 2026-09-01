import { oxfmtConfig } from '@marcalexiei/oxfmt-config';

// oxfmt only auto-discovers `.oxfmtrc.json`, so every invocation has to pass `-c`.
export default {
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
