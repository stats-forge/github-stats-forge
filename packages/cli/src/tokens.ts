/**
 * @file Where the GitHub token comes from.
 *
 * In the order a run should prefer them: the flag, the `PAT_n` variables from the environment or
 * an env file, then the `GH_TOKEN` or `GITHUB_TOKEN` that `gh` and GitHub Actions set.
 * Whatever is left over is asked for interactively, so a first run needs no setup.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { PersonalAccessToken } from '@stats-forge/github-stats-forge-core/api';

/** The file loaded when `--env-file` is not given. */
export const DEFAULT_ENV_FILE = '.env';

/**
 * Loads an env file into `process.env`, the way `node --env-file` would.
 *
 * @throws {Error} When `required` and the file is not there.
 *
 * @returns Whether anything was loaded.
 */
export const loadEnvFile = (path: string, required: boolean): boolean => {
  const absolute = resolve(process.cwd(), path);
  if (!existsSync(absolute)) {
    if (required) {
      throw new Error(`No env file at ${absolute}`);
    }
    return false;
  }
  process.loadEnvFile(absolute);
  return true;
};

/**
 * The tokens an env holds, under the `PAT_1`, `PAT_2`, … names core reads,
 * in name order and skipping any that are empty.
 *
 * @returns The tokens, in name order, skipping any that are empty.
 */
export const tokensFromEnv = (
  env: Record<string, string | undefined>,
): Array<PersonalAccessToken> =>
  Object.keys(env)
    .filter((name) => /^PAT_\d+$/.test(name))
    .toSorted()
    .flatMap((name) => {
      const value = env[name];
      return value ? [{ name, value }] : [];
    });

/** Where `gh` and GitHub Actions already keep a token. */
const SHARED_TOKEN_NAMES = ['GH_TOKEN', 'GITHUB_TOKEN'] as const;

/**
 * The tokens a run will use.
 *
 * @returns The tokens, empty when the run has none yet.
 */
export const resolveTokens = (
  flags: ReadonlyArray<string>,
  env: Record<string, string | undefined>,
): Array<PersonalAccessToken> => {
  const fromFlags = flags
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value, index) => ({ name: `--pat #${index + 1}`, value }));

  if (fromFlags.length > 0) {
    return fromFlags;
  }
  const fromPATs = tokensFromEnv(env);
  if (fromPATs.length > 0) {
    return fromPATs;
  }
  // gh's own precedence: one token, GH_TOKEN before the GITHUB_TOKEN Actions sets
  const name = SHARED_TOKEN_NAMES.find((candidate) => env[candidate]);
  if (name === undefined) {
    return [];
  }
  return [{ name, value: env[name] ?? '' }];
};
