/**
 * @file A `Request` in, a `Response` out — web-standard rather than `req`/`res`,
 * so an endpoint is testable without a socket.
 */

import { createHash } from 'node:crypto';

import type { ApiResult, CardConfig, ErrorCode } from '@stats-forge/github-stats-forge-core/api';
import { queryOf } from '@stats-forge/github-stats-forge-core/api';

import { TTL, cacheControl, cacheKey, parseInteger, ttlFor } from './cache.ts';
import type { CacheHit, CardCache } from './cache.ts';
import { compress } from './compress.ts';
import { HEALTH_PATH } from './health.ts';
import type { RateLimits } from './rate-limits.ts';
import { CARD_ROUTES, normalizePath } from './routes.ts';
import type { CardHandler } from './routes.ts';

/** What the deployment decided, as the handler needs it. */
interface ServerOptions {
  config: CardConfig;
  /**
   * Whether a failure answers with the status code it deserves.
   * Off by default: GitHub's image proxy only displays a `200`.
   */
  strictHttpStatus: boolean;
  /** `CACHE_SECONDS`: the default a success keeps for, and `0` to turn caching off entirely. */
  cacheSeconds: number | undefined;
  /** The single origin allowed to read a card from script; CORS is off when absent. */
  corsOrigin: string | undefined;
  /** The answers this process is holding. A TTL of `0` stores nothing, so it is never absent. */
  cache: CardCache;
  /** Each token's budget, as the answers passing through reported it. */
  rateLimits: RateLimits;
  /** The built documentation site, or `undefined` when this deployment carries none. */
  site: ((pathname: string) => Promise<Response | undefined>) | undefined;
}

/** What an operator reads to see how the instance is doing; not a card, and never cached. */
const STATUS_PATH = '/statusz';

/** Longest URL the server will parse, so a pathological query costs nothing to reject. */
const MAX_URL_LENGTH = 4096;

/** The second line behind core's escaping, for a card URL opened directly rather than in an `<img>`. */
const CARD_CSP = "default-src 'none'; style-src 'unsafe-inline'";

/** What a failure deserves under `STRICT_HTTP_STATUS`. */
const STRICT_STATUS: Record<ErrorCode, number> = {
  // the token is authenticated and not permitted, which is what GitHub itself said
  forbidden: 403,
  invalid_param: 400,
  missing_param: 400,
  not_allowed: 403,
  not_found: 404,
  no_tokens: 500,
  rate_limited: 429,
  upstream: 502,
};

/**
 * What a card answers with beyond the SVG, so a host branches on a header instead of parsing an
 * image. Exposed to CORS readers, who cannot see them otherwise.
 * No `X-` prefix: RFC 6648 deprecated it.
 */
const CARD_HEADERS = 'Card-Status, Card-Error-Code, Card-Error-Param, Card-Cache';

/**
 * Everything that is not a card: nothing asked for an image, so nothing draws one.
 *
 * @returns The response.
 */
const problem = (
  status: number,
  error: string,
  message: string,
  extra?: Record<string, string>,
): Response =>
  new Response(`${JSON.stringify({ error, message })}\n`, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });

/**
 * Weak, so a proxy that compresses the body may keep it.
 *
 * @returns The validator for a drawn body.
 */
const etagOf = (content: string): string =>
  `W/"${createHash('sha1').update(content).digest('base64url')}"`;

/** @returns The tag without its weakness marker, which weak comparison ignores. */
const opaque = (tag: string): string => tag.trim().replace(/^W\//, '');

/**
 * Weak comparison, as RFC 9110 asks of `If-None-Match`.
 *
 * @returns Whether the caller already holds the body named by `etag`.
 */
const matches = (ifNoneMatch: string | null, etag: string): boolean => {
  if (ifNoneMatch === null) {
    return false;
  }

  return ifNoneMatch.split(',').some((tag) => tag.trim() === '*' || opaque(tag) === opaque(etag));
};

/** Where an answer came from: drawn now, held and fresh, or held past its TTL through a failure. */
type Origin = { from: 'miss' } | { from: 'hit' | 'stale'; age: number };

/**
 * The drawn card, or the drawn error, with the truth about it in the headers.
 *
 * @returns The response.
 */
const cardResponse = (
  result: ApiResult,
  ttl: number,
  served: Origin,
  strictHttpStatus: boolean,
  /** The request's `If-None-Match`, answered with a `304` when it names this body. */
  ifNoneMatch: string | null,
): Response => {
  const etag = etagOf(result.content);
  const headers = new Headers({
    'content-type': 'image/svg+xml; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'content-security-policy': CARD_CSP,
    'cache-control': cacheControl(ttl),
    'card-status': result.status,
    'card-cache': served.from,
    etag,
  });

  if (served.from !== 'miss') {
    // a downstream cache subtracts this from `max-age`, so a held answer does not claim a full life
    headers.set('age', String(served.age));
  }

  if (result.status === 'error') {
    headers.set('card-error-code', result.error.code);
    if (result.error.param !== undefined) {
      headers.set('card-error-param', result.error.param);
    }
  }

  const failing = result.status === 'error' && strictHttpStatus;
  if (failing && result.retryable) {
    // when the answer might change, which `max-age` stops saying once `CACHE_SECONDS=0`
    headers.set('retry-after', String(TTL.retryableError));
  }

  if (failing) {
    return new Response(result.content, { status: STRICT_STATUS[result.error.code], headers });
  }

  if (matches(ifNoneMatch, etag)) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(result.content, {
    status: 200,
    headers,
  });
};

/**
 * What every answer gets regardless of what produced it: the CORS headers when an origin is
 * configured, compression when it is text, and no body for a `HEAD`.
 *
 * @returns The response as it goes out.
 */
const finish = async (
  request: Request,
  response: Response,
  corsOrigin: string | undefined,
): Promise<Response> => {
  const headers = new Headers(response.headers);

  if (corsOrigin !== undefined) {
    headers.set('access-control-allow-origin', corsOrigin);
    headers.set('access-control-expose-headers', CARD_HEADERS);
    headers.append('vary', 'Origin');
  }

  // before the `HEAD` is emptied, so its `Content-Length` is the one a `GET` would send
  const encoded = await compress(
    request,
    new Response(response.body, { status: response.status, headers }),
  );

  if (request.method !== 'HEAD') {
    return encoded;
  }

  const body = await encoded.arrayBuffer();
  const emptied = new Headers(encoded.headers);
  emptied.set('content-length', String(body.byteLength));
  return new Response(null, { status: response.status, headers: emptied });
};

/** A fresh draw, and the last good card it failed to replace, when it failed retryably. */
interface Drawn {
  result: ApiResult;
  stale: CacheHit | undefined;
}

/** The cards being drawn right now, so N requests arriving during one render share it. */
type InFlight = Map<string, Promise<Drawn>>;

/** How each card answer was served since the process started, keyed by its `Card-Cache`. */
type Served = Record<'hit' | 'miss' | 'stale', number>;

/** What lives as long as the handler: the draws in flight, and what `/statusz` reports. */
interface HandlerState {
  inFlight: InFlight;
  served: Served;
  startedAt: number;
}

/**
 * @returns The status document: the card cache, how answers were served, and each token's budget.
 */
const statusResponse = (options: ServerOptions, state: HandlerState): Response =>
  new Response(
    `${JSON.stringify({
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - state.startedAt) / 1000),
      cache: { entries: options.cache.size, served: state.served },
      tokens: options.rateLimits.snapshot(),
    })}\n`,
    {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    },
  );

/**
 * A card, drawn once however many requests for it arrive meanwhile, and held under the
 * deployment's default TTL whatever the request that drew it asked for.
 *
 * @returns The answer.
 */
const drawCard = async (
  render: CardHandler,
  key: string,
  query: Record<string, string>,
  options: ServerOptions,
  inFlight: InFlight,
): Promise<Drawn> => {
  const pending = inFlight.get(key);
  if (pending !== undefined) {
    return pending;
  }

  const draw = async (): Promise<Drawn> => {
    try {
      const result = await render(query, options.config);
      // an outage keeps the last good card, which a retryable error would otherwise overwrite
      const stale =
        result.status === 'error' && result.retryable ? options.cache.getStale(key) : undefined;
      if (stale === undefined) {
        options.cache.set(key, result, ttlFor(result, options.cacheSeconds));
      }
      return { result, stale };
    } finally {
      inFlight.delete(key);
    }
  };

  const drawing = draw();
  inFlight.set(key, drawing);
  return drawing;
};

/**
 * The answer before CORS and `HEAD` are applied to it.
 *
 * @returns The response.
 */
const route = async (
  request: Request,
  options: ServerOptions,
  state: HandlerState,
): Promise<Response> => {
  if (request.url.length > MAX_URL_LENGTH) {
    return problem(414, 'uri_too_long', 'The request URL is too long');
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return problem(405, 'method_not_allowed', 'Only GET and HEAD are served', {
      allow: 'GET, HEAD',
    });
  }

  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  if (path === HEALTH_PATH) {
    return new Response(`${JSON.stringify({ status: 'ok' })}\n`, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (path === STATUS_PATH) {
    return statusResponse(options, state);
  }

  const render = CARD_ROUTES.get(path);
  if (!render) {
    // the site is claimed last, so no page can shadow a card or the health check
    return (
      (await options.site?.(url.pathname)) ??
      problem(404, 'not_found', 'No card is served at this path')
    );
  }

  const ifNoneMatch = request.headers.get('if-none-match');
  // the request's own, for the header; `0` refuses the held copy as well
  const wanted = parseInteger(url.searchParams.get('cache_seconds')) ?? options.cacheSeconds;
  const key = cacheKey(path, url.searchParams);

  const hit = wanted === 0 ? undefined : options.cache.get(key);
  if (hit) {
    return cardResponse(
      hit.result,
      ttlFor(hit.result, wanted),
      { from: 'hit', age: hit.age },
      options.strictHttpStatus,
      ifNoneMatch,
    );
  }

  const query = queryOf(url.searchParams);
  const { result, stale } = await drawCard(render, key, query, options, state.inFlight);

  // a short life, so the next request tries GitHub again; `0` refuses a held copy, stale or not
  if (stale && wanted !== 0) {
    return cardResponse(
      stale.result,
      TTL.retryableError,
      { from: 'stale', age: stale.age },
      options.strictHttpStatus,
      ifNoneMatch,
    );
  }

  return cardResponse(
    result,
    ttlFor(result, wanted),
    { from: 'miss' },
    options.strictHttpStatus,
    ifNoneMatch,
  );
};

/**
 * The server, bound to what this deployment configured.
 *
 * @returns The handler: a `Request` in, a `Response` out.
 */
const createHandler = (options: ServerOptions) => {
  const state: HandlerState = {
    inFlight: new Map(),
    served: { hit: 0, miss: 0, stale: 0 },
    startedAt: Date.now(),
  };

  return async (request: Request): Promise<Response> => {
    const response = await route(request, options, state);
    const from = response.headers.get('card-cache');
    if (from === 'hit' || from === 'miss' || from === 'stale') {
      state.served[from] += 1;
    }
    return finish(request, response, options.corsOrigin);
  };
};

export type { ServerOptions };

export { STATUS_PATH, STRICT_STATUS, createHandler, problem };
