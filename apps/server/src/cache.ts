/**
 * @file How long an answer keeps, and the copy the process keeps of it.
 *
 * `ApiResult.retryable` already answers "can a retry help", which is what a TTL is for,
 * so the table has three rows rather than one per card.
 */

import type { ApiResult } from '@stats-forge/github-stats-forge-core/api';

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/** How long an answer stays fresh, in seconds, by what it is. */
const TTL = {
  /** A card's numbers move slowly. */
  success: 10 * HOUR,
  /** `rate_limited`, `upstream` or `no_tokens`: it may fix itself. */
  retryableError: 10 * MINUTE,
  /** The query will not fix itself, and redrawing it costs a rate-limit point every time. */
  permanentError: HOUR,
} as const;

/** The span a caller may ask a success to be cached for. */
const MIN_CACHE_SECONDS = 4 * HOUR;
const MAX_CACHE_SECONDS = 24 * HOUR;

/**
 * How long a stale card may still be served while a fresh one is fetched, downstream and here:
 * a held success outlives its TTL by this much, to answer for a redraw that fails.
 */
const STALE_WHILE_REVALIDATE = 24 * HOUR;

/**
 * A whole number from a query param or an environment variable, which are the server's own
 * and so fall back rather than fail.
 *
 * @returns The number, or `undefined` when the value is absent or not one.
 */
const parseInteger = (value: string | null | undefined): number | undefined => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * How long this answer keeps. Only a success is negotiable: an error's TTL is what stops a
 * broken query from spending a rate-limit point per view.
 *
 * @returns Seconds, `0` when caching is off for this deployment.
 */
const ttlFor = (
  result: ApiResult,
  /** `cache_seconds`, or the `CACHE_SECONDS` default; `0` turns caching off entirely. */
  requested: number | undefined,
): number => {
  if (requested === 0) {
    return 0;
  }
  if (result.status === 'error') {
    return result.retryable ? TTL.retryableError : TTL.permanentError;
  }
  if (requested === undefined) {
    return TTL.success;
  }
  return Math.min(Math.max(requested, MIN_CACHE_SECONDS), MAX_CACHE_SECONDS);
};

/**
 * @returns The `Cache-Control` value for an answer that keeps `seconds`.
 */
const cacheControl = (seconds: number): string => {
  if (seconds === 0) {
    return 'no-store';
  }

  return `max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`;
};

/**
 * What a request asked for, without `cache_seconds`: it names how long the answer keeps,
 * not what is drawn, so the header is rebuilt per request instead.
 *
 * @returns The key this request's answer is stored under.
 */
const cacheKey = (path: string, params: URLSearchParams): string => {
  const keyed = new URLSearchParams(params);
  keyed.delete('cache_seconds');
  keyed.sort();
  return `${path}?${keyed.toString()}`;
};

/** A stored answer, when it was drawn, when it stops being fresh, and when it stops being kept. */
interface CacheEntry {
  result: ApiResult;
  storedAt: number;
  expiresAt: number;
  /** `expiresAt` for an error, which is never served stale. */
  staleUntil: number;
}

/** A hit: the answer, and how long ago it was drawn. */
interface CacheHit {
  result: ApiResult;
  /** Seconds since it was drawn, for the `Age` header a downstream cache subtracts from `max-age`. */
  age: number;
}

/**
 * The rendered answers this process is holding: a hot README costs one GitHub request per TTL
 * instead of one per view, and keeps its last good card through an outage. Per-instance, and lost
 * on restart.
 */
class CardCache {
  readonly #entries = new Map<string, CacheEntry>();
  readonly #maxEntries: number;

  constructor(maxEntries: number) {
    this.#maxEntries = maxEntries;
  }

  /** How many answers are held, stale ones and those past keeping included until the next sweep. */
  get size(): number {
    return this.#entries.size;
  }

  /** @returns The stored answer, or `undefined` when there is none or it has expired. */
  get(key: string): CacheHit | undefined {
    const entry = this.#kept(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      return undefined;
    }

    return CardCache.#hit(entry);
  }

  /** @returns A success that has expired but is still kept, for a redraw that just failed. */
  getStale(key: string): CacheHit | undefined {
    const entry = this.#kept(key);
    if (entry?.result.status !== 'success') {
      return undefined;
    }

    return CardCache.#hit(entry);
  }

  /** Stores the answer for `ttlSeconds`; a TTL of `0` stores nothing. */
  set(key: string, result: ApiResult, ttlSeconds: number): void {
    if (ttlSeconds === 0) {
      return;
    }

    this.#sweep();
    // re-inserting moves the key to the end, which keeps the eviction oldest-first
    this.#entries.delete(key);

    const storedAt = Date.now();
    const expiresAt = storedAt + ttlSeconds * 1000;
    const staleUntil =
      result.status === 'success' ? expiresAt + STALE_WHILE_REVALIDATE * 1000 : expiresAt;
    this.#entries.set(key, { result, storedAt, expiresAt, staleUntil });
  }

  /** @returns The entry, unless it is past keeping, which it then forgets. */
  #kept(key: string): CacheEntry | undefined {
    const entry = this.#entries.get(key);
    if (entry && entry.staleUntil <= Date.now()) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry;
  }

  static #hit(entry: CacheEntry): CacheHit {
    return { result: entry.result, age: Math.floor((Date.now() - entry.storedAt) / 1000) };
  }

  /**
   * Drops what is past keeping, then what has expired, then the oldest of what is left, until
   * there is room for one more: a stale card is the first thing worth giving up.
   */
  #sweep(): void {
    if (this.#entries.size < this.#maxEntries) {
      return;
    }

    const now = Date.now();
    for (const [key, entry] of this.#entries) {
      if (entry.staleUntil <= now) {
        this.#entries.delete(key);
      }
    }

    for (const [key, entry] of this.#entries) {
      if (this.#entries.size < this.#maxEntries) {
        return;
      }
      if (entry.expiresAt <= now) {
        this.#entries.delete(key);
      }
    }

    for (const key of this.#entries.keys()) {
      if (this.#entries.size < this.#maxEntries) {
        break;
      }
      this.#entries.delete(key);
    }
  }
}

export type { CacheHit };

export {
  CardCache,
  MAX_CACHE_SECONDS,
  MIN_CACHE_SECONDS,
  STALE_WHILE_REVALIDATE,
  TTL,
  cacheControl,
  cacheKey,
  parseInteger,
  ttlFor,
};
