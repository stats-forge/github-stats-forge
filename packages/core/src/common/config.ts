import { defaultFetch } from './http.ts';
import type { FetchLike } from './http.ts';

type Env = Record<string, string | undefined>;

/** Which list guards an identity. `username` is any GitHub login, an organization's included. */
type AllowlistKind = 'username' | 'gist';

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
 * @returns The comma-separated values, trimmed, or `undefined` when the variable is unset or empty.
 */
const parseCsv = (value: string | undefined): Array<string> | undefined => {
  const values = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  return values.length > 0 ? values : undefined;
};

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
 * An empty variable is an unset one: `docker compose` writes `PAT_2=` for a token left blank.
 *
 * @returns Personal access tokens found in the environment.
 */
const parsePATsFromEnv = (env: Env): Array<PersonalAccessToken> =>
  Object.keys(env)
    .filter((key) => /PAT_\d*$/.exec(key))
    .map((name) => ({ name, value: env[name] ?? '' }))
    .filter((pat) => pat.value !== '');

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
      usernameAllowlist: parseCsv(env['ALLOWLIST']),
      gistAllowlist: parseCsv(env['GIST_ALLOWLIST']),
      excludeRepositories: parseCsv(env['EXCLUDE_REPO']) ?? [],
      fetchMultiPageStars: parseFetchMultiPageStars(env['FETCH_MULTI_PAGE_STARS']),
    });
  }

  /**
   * Matched case-insensitively, as a GitHub login is; an absent list serves anyone.
   *
   * @returns Whether this deployment serves the id.
   */
  isAllowed(id: string, kind: AllowlistKind): boolean {
    const list = kind === 'gist' ? this.gistAllowlist : this.usernameAllowlist;
    const wanted = id.toLowerCase();
    return list === undefined || list.some((allowed) => allowed.toLowerCase() === wanted);
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

export type { AllowlistKind, PersonalAccessToken, CardConfigInit };
