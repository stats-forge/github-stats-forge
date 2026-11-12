/**
 * @file Each token's rate limit, as GitHub last reported it: read off the answers already passing
 * through, so knowing it costs no request.
 */

import type { FetchLike, PersonalAccessToken } from '@stats-forge/github-stats-forge-core/api';

/** One token's budget, as of the last answer GitHub sent for it. */
interface RateLimit {
  /** The token's env variable, never its value. */
  name: string;
  /** `null` until GitHub has answered a request made with this token. */
  remaining: number | null;
  limit: number | null;
  /** ISO 8601. */
  resetsAt: string | null;
}

/**
 * @returns The header as a whole number, or `undefined` when GitHub sent none.
 */
const headerNumber = (headers: Headers, name: string): number | undefined => {
  const value = Number.parseInt(headers.get(name) ?? '', 10);
  return Number.isNaN(value) ? undefined : value;
};

class RateLimits {
  /** Keyed by the `Authorization` value, so a token is matched without being stored twice. */
  readonly #byAuthorization = new Map<string, RateLimit>();

  constructor(pats: ReadonlyArray<PersonalAccessToken>) {
    for (const pat of pats) {
      this.#byAuthorization.set(`bearer ${pat.value}`, {
        name: pat.name,
        remaining: null,
        limit: null,
        resetsAt: null,
      });
    }
  }

  /** @returns Every token's last reported budget, in the order the tokens are tried. */
  snapshot(): Array<RateLimit> {
    return [...this.#byAuthorization.values()].map((limit) => ({ ...limit }));
  }

  /** @returns The transport, recording each GitHub answer's rate-limit headers on the way back. */
  observing(fetch: FetchLike): FetchLike {
    return async (input, init) => {
      const response = await fetch(input, init);
      const authorization = new Headers(init?.headers).get('authorization');
      const entry = authorization === null ? undefined : this.#byAuthorization.get(authorization);
      const remaining = headerNumber(response.headers, 'x-ratelimit-remaining');
      if (entry === undefined || remaining === undefined) {
        return response;
      }

      entry.remaining = remaining;
      entry.limit = headerNumber(response.headers, 'x-ratelimit-limit') ?? entry.limit;
      const reset = headerNumber(response.headers, 'x-ratelimit-reset');
      if (reset !== undefined) {
        entry.resetsAt = new Date(reset * 1000).toISOString();
      }
      return response;
    };
  }
}

export { RateLimits };
