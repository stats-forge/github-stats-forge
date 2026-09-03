import { defaultFetch } from './http.js';
import type { FetchLike } from './http.js';

type Env = Record<string, string | undefined>;

interface PersonalAccessToken {
  /** Env variable the token came from — the retryer logs this name, never the value. */
  name: string;
  value: string;
}

/** Overrides for a {@link CardConfig}; the constructor defaults anything omitted. */
interface CardConfigInit {
  pats?: ReadonlyArray<PersonalAccessToken>;
  usernameAllowlist?: ReadonlyArray<string> | undefined;
  gistAllowlist?: ReadonlyArray<string> | undefined;
  excludeRepositories?: ReadonlyArray<string>;
  fetchMultiPageStars?: number;
  fetch?: FetchLike;
}

/**
 * @returns Parsed string values.
 */
const parseCsv = (value: string | undefined): Array<string> | undefined =>
  value ? value.split(',') : undefined;

/**
 * @returns Page limit: `"true"` means every page, a positive number caps the pages, anything else means one.
 */
const parseFetchMultiPageStars = (value: string | undefined): number => {
  if (value === 'true') {
    return Infinity;
  }
  const limit = Number(value);
  return limit > 0 ? limit : 1;
};

/**
 * @returns Personal access tokens found in the environment.
 */
const parsePATsFromEnv = (env: Env): Array<PersonalAccessToken> =>
  Object.keys(env)
    .filter((key) => /PAT_\d*$/.exec(key))
    .map((name) => ({ name, value: env[name] ?? '' }));

/**
 * Deployment-wide configuration for the card renderers.
 *
 * Immutable, and built by the host rather than read from the environment, so the
 * library behaves identically under Node, in the browser and under vitest.
 */
export class CardConfig {
  readonly pats: ReadonlyArray<PersonalAccessToken>;
  /** Allowed usernames; `undefined` means no allowlist configured. */
  readonly usernameAllowlist: ReadonlyArray<string> | undefined;
  /** Allowed gist ids; `undefined` means no allowlist configured. */
  readonly gistAllowlist: ReadonlyArray<string> | undefined;
  readonly excludeRepositories: ReadonlyArray<string>;
  /** Max pages of starred repos; `Infinity` means every page, `1` only the first. */
  readonly fetchMultiPageStars: number;
  /** Transport every fetcher sends through; defaults to `globalThis.fetch`. */
  readonly fetch: FetchLike;

  constructor(init: CardConfigInit = {}) {
    this.pats = init.pats ?? [];
    this.usernameAllowlist = init.usernameAllowlist;
    this.gistAllowlist = init.gistAllowlist;
    this.excludeRepositories = init.excludeRepositories ?? [];
    this.fetchMultiPageStars = init.fetchMultiPageStars ?? 1;
    this.fetch = init.fetch ?? defaultFetch;
  }

  /** @returns Config for this deployment. */
  static fromEnv(env: Env): CardConfig {
    return new CardConfig({
      pats: parsePATsFromEnv(env),
      usernameAllowlist: parseCsv(env['WHITELIST']),
      gistAllowlist: parseCsv(env['GIST_WHITELIST']),
      excludeRepositories: parseCsv(env['EXCLUDE_REPO']) ?? [],
      fetchMultiPageStars: parseFetchMultiPageStars(env['FETCH_MULTI_PAGE_STARS']),
    });
  }

  /** @returns Whether this deployment serves the id. */
  isAllowed(id: string, kind: 'username' | 'gist'): boolean {
    const list = kind === 'gist' ? this.gistAllowlist : this.usernameAllowlist;
    return list === undefined || list.includes(id);
  }

  /** @returns A copy with `overrides` applied — how a host swaps in a user's PAT per request. */
  with(overrides: CardConfigInit): CardConfig {
    return new CardConfig({
      pats: this.pats,
      usernameAllowlist: this.usernameAllowlist,
      gistAllowlist: this.gistAllowlist,
      excludeRepositories: this.excludeRepositories,
      fetchMultiPageStars: this.fetchMultiPageStars,
      fetch: this.fetch,
      ...overrides,
    });
  }
}

export type { PersonalAccessToken, CardConfigInit };
