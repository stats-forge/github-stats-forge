import { defineConfig } from '@marcalexiei/oxfmt-config';

// Auto-discovered by name. `.oxfmtrc.ts` is not — only `.oxfmtrc.{json,jsonc}` and this one.
export default defineConfig({
  // Opt-in; runs through the `@astrojs/compiler-rs` pnpm installs as oxfmt's peer.
  astro: true,
  // oxfmt already skips lock files, but the rule is spelled out so it survives that default changing.
  ignorePatterns: [
    'pnpm-lock.yaml',
    // written by `astro sync`, and rewritten on every build
    'apps/docs/.astro/**',
  ],
});
