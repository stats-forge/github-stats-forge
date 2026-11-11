/**
 * @file The environment, read once at startup: the only file that knows `process.env` exists.
 */

import { CardConfig } from '@stats-forge/github-stats-forge-core/api';

import { CardCache, STALE_WHILE_REVALIDATE, parseInteger, successTtl } from './cache.ts';
import type { ServerOptions } from './handler.ts';
import { DEFAULT_HOST, DEFAULT_PORT } from './health.ts';
import { RateLimits } from './rate-limits.ts';
import { createStaticHandler } from './static.ts';
import { holdingUpstream } from './upstream.ts';

type Env = Record<string, string | undefined>;

/** One slow GitHub call must not pin a connection for as long as GitHub takes. */
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/** A few megabytes of SVG, which is more READMEs than one instance is likely to serve. */
const DEFAULT_CACHE_MAX_ENTRIES = 500;

/** Megabytes of upstream answers held at most: a few hundred cards' worth of GitHub data. */
const DEFAULT_CACHE_UPSTREAM_MB = 16;

/**
 * Seconds an upstream answer is held: enough for a card redrawn in another look, short enough that
 * a card redrawn once its own TTL runs out sees new numbers.
 */
const UPSTREAM_HOLD_SECONDS = 300;

/** How long `docker stop` is given to drain before the listener is dropped anyway. */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/** The advice core leaves to the host, worded for an operator who configures through the environment. */
const HINTS = {
  rate_limited: 'You can deploy own instance or wait until public will be no longer limited',
  tokens_missing:
    'Please add an env variable called PAT_1 with your GitHub API token in your deployment environment',
  tokens_rejected: 'Replace the expired or revoked PAT_* variables in your deployment environment',
};

/** Everything the process needs, as the environment described it. */
interface ServerSettings {
  port: number;
  host: string;
  shutdownTimeoutMs: number;
  logRequests: boolean;
  /** Where the card cache is kept across restarts; in memory only when absent. */
  cacheDir: string | undefined;
  options: ServerOptions;
}

/**
 * An empty variable is an unset one: `docker compose` writes `""` for every `${VAR:-}` it has no
 * value for, and an empty `CACHE_SECONDS` read as a number would be `0`.
 *
 * @returns The value, or `undefined` when it is absent or empty.
 */
const fromEnv = (value: string | undefined): string | undefined => {
  if (value === '') {
    return undefined;
  }

  return value;
};

/**
 * @returns What this deployment configured.
 */
const readSettings = (env: Env): ServerSettings => {
  const siteDir = fromEnv(env['SITE_DIR']);
  const cacheSeconds = parseInteger(env['CACHE_SECONDS']);
  const base = CardConfig.fromEnv(env);
  const rateLimits = new RateLimits(base.pats);

  return {
    port: parseInteger(env['PORT']) ?? DEFAULT_PORT,
    host: fromEnv(env['HOST']) ?? DEFAULT_HOST,
    shutdownTimeoutMs: parseInteger(env['SHUTDOWN_TIMEOUT_MS']) ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    logRequests: env['LOG_REQUESTS'] !== 'false',
    cacheDir: fromEnv(env['CACHE_DIR']),
    options: {
      config: base.with({
        // the global is read per call, so a host patching it later is still picked up
        fetch: holdingUpstream(
          rateLimits.observing(async (input, init) => fetch(input, init)),
          Math.min(successTtl(cacheSeconds), UPSTREAM_HOLD_SECONDS),
          (parseInteger(env['CACHE_UPSTREAM_MB']) ?? DEFAULT_CACHE_UPSTREAM_MB) * 1024 * 1024,
        ),
        requestTimeoutMs: parseInteger(env['REQUEST_TIMEOUT_MS']) ?? DEFAULT_REQUEST_TIMEOUT_MS,
        hints: HINTS,
      }),
      strictHttpStatus: env['STRICT_HTTP_STATUS'] === 'true',
      // `0` is the one switch: it stores nothing as well as sending `no-store`
      cacheSeconds,
      corsOrigin: fromEnv(env['CORS_ORIGIN']),
      cache: new CardCache(
        parseInteger(env['CACHE_MAX_ENTRIES']) ?? DEFAULT_CACHE_MAX_ENTRIES,
        parseInteger(env['STALE_SECONDS']) ?? STALE_WHILE_REVALIDATE,
      ),
      rateLimits,
      // set by the image; without it the server draws cards and serves no pages
      site: siteDir === undefined ? undefined : createStaticHandler(siteDir),
    },
  };
};

export { readSettings };
