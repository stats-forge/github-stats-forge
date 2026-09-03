import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { PersonalAccessToken } from '@stats-forge/github-stats-forge-core/api';

/**
 * @file Where the GitHub token comes from.
 *
 * Three sources, in the order a run should prefer them:
 * the flag, an env file, then the environment the shell already carries.
 * Whatever is left over is asked for interactively, so a first run needs no setup.
 */

/** The file loaded when `--env-file` is not given. */
export const DEFAULT_ENV_FILE = '.env';

/**
 * Loads an env file into `process.env`, the way `node --env-file` would.
 *
 * @param path File to load, relative to the working directory.
 * @param required Whether a missing file is an error.
 * @returns Whether anything was loaded.
 * @throws {Error} When `required` and the file is not there.
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
 * The tokens an env holds, under the `PAT_1`, `PAT_2`, … names core reads.
 *
 * @param env Environment to read.
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

/**
 * The tokens a run will use.
 *
 * @param flags Tokens passed as `--pat`, which win over the environment.
 * @param env Environment to read, once any env file has been loaded into it.
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

  return fromFlags.length > 0 ? fromFlags : tokensFromEnv(env);
};
