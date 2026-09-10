/**
 * @file The environment, read once at startup: the only file that knows `process.env` exists.
 */

import { CardConfig } from '@stats-forge/github-stats-forge-core/api';
import type { FetchLike } from '@stats-forge/github-stats-forge-core/api';

import { CardCache, parseInteger } from './cache.ts';
import type { ServerOptions } from './handler.ts';
import { DEFAULT_HOST, DEFAULT_PORT } from './health.ts';
import { createStaticHandler } from './static.ts';

type Env = Record<string, string | undefined>;

/** One slow GitHub call must not pin a connection for as long as GitHub takes. */
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/** A few megabytes of SVG, which is more READMEs than one instance is likely to serve. */
const DEFAULT_CACHE_MAX_ENTRIES = 500;

/** How long `docker stop` is given to drain before the listener is dropped anyway. */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/** Everything the process needs, as the environment described it. */
interface ServerSettings {
  port: number;
  host: string;
  shutdownTimeoutMs: number;
  logRequests: boolean;
  options: ServerOptions;
}

/**
 * An empty variable is an unset one: `docker compose` writes `""` for every `${VAR:-}` it has no
 * value for, and an empty `CACHE_SECONDS` read as a number would be `0`.
 *
 * @returns The value, or `undefined` when it is absent or empty.
 */
const fromEnv = (value: string | undefined): string | undefined =>
  value === '' ? undefined : value;

/**
 * A transport that gives up rather than waiting on GitHub forever. Core wraps the rejection as
 * `upstream`, so a timeout draws the retryable error card instead of holding the socket.
 *
 * @returns The transport to hand `CardConfig`.
 */
const withTimeout =
  (timeoutMs: number): FetchLike =>
  (input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });

/**
 * @returns What this deployment configured.
 */
const readSettings = (env: Env): ServerSettings => {
  const siteDir = fromEnv(env['SITE_DIR']);

  return {
    port: parseInteger(env['PORT']) ?? DEFAULT_PORT,
    host: fromEnv(env['HOST']) ?? DEFAULT_HOST,
    shutdownTimeoutMs: parseInteger(env['SHUTDOWN_TIMEOUT_MS']) ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    logRequests: env['LOG_REQUESTS'] !== 'false',
    options: {
      config: CardConfig.fromEnv(env).with({
        fetch: withTimeout(parseInteger(env['REQUEST_TIMEOUT_MS']) ?? DEFAULT_REQUEST_TIMEOUT_MS),
      }),
      strictHttpStatus: env['STRICT_HTTP_STATUS'] === 'true',
      // `0` is the one switch: it stores nothing as well as sending `no-store`
      cacheSeconds: parseInteger(env['CACHE_SECONDS']),
      corsOrigin: fromEnv(env['CORS_ORIGIN']),
      cache: new CardCache(parseInteger(env['CACHE_MAX_ENTRIES']) ?? DEFAULT_CACHE_MAX_ENTRIES),
      // set by the image; without it the server draws cards and serves no pages
      site: siteDir === undefined ? undefined : createStaticHandler(siteDir),
    },
  };
};

export { readSettings };
