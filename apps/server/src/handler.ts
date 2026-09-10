/**
 * @file A `Request` in, a `Response` out — web-standard rather than `req`/`res`,
 * so an endpoint is testable without a socket.
 */

import type { ApiResult, CardConfig, ErrorCode } from '@stats-forge/github-stats-forge-core/api';

import { TTL, cacheControl, cacheKey, parseInteger, ttlFor } from './cache.ts';
import type { CardCache } from './cache.ts';
import { HEALTH_PATH } from './health.ts';
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
  /** The built documentation site, or `undefined` when this deployment carries none. */
  site: ((pathname: string) => Promise<Response | undefined>) | undefined;
}

/** Longest URL the server will parse, so a pathological query costs nothing to reject. */
const MAX_URL_LENGTH = 4096;

/** The second line behind core's escaping, for a card URL opened directly rather than in an `<img>`. */
const CARD_CSP = "default-src 'none'; style-src 'unsafe-inline'";

/** What a failure deserves under `STRICT_HTTP_STATUS`. */
const STRICT_STATUS: Record<ErrorCode, number> = {
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
 * The drawn card, or the drawn error, with the truth about it in the headers.
 *
 * @returns The response.
 */
const cardResponse = (
  result: ApiResult,
  ttl: number,
  /** Seconds this answer has been held, `undefined` when it was just drawn. */
  age: number | undefined,
  strictHttpStatus: boolean,
): Response => {
  const headers = new Headers({
    'content-type': 'image/svg+xml; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'content-security-policy': CARD_CSP,
    'cache-control': cacheControl(ttl),
    'card-status': result.status,
    'card-cache': age === undefined ? 'miss' : 'hit',
  });

  if (age !== undefined) {
    // a downstream cache subtracts this from `max-age`, so a held answer does not claim a full life
    headers.set('age', String(age));
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

  return new Response(result.content, {
    status: failing ? STRICT_STATUS[result.error.code] : 200,
    headers,
  });
};

/**
 * What every answer gets regardless of what produced it: the CORS headers when an origin is
 * configured, and no body for a `HEAD`.
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

  if (request.method !== 'HEAD') {
    return new Response(response.body, { status: response.status, headers });
  }

  const body = await response.arrayBuffer();
  headers.set('content-length', String(body.byteLength));
  return new Response(null, { status: response.status, headers });
};

/** The cards being drawn right now, so N requests arriving during one render share it. */
type InFlight = Map<string, Promise<ApiResult>>;

/**
 * A card, drawn once however many requests for it arrive meanwhile, and held under the
 * deployment's default TTL whatever the request that drew it asked for.
 *
 * @returns The answer.
 */
const drawCard = (
  render: CardHandler,
  key: string,
  query: Record<string, string>,
  options: ServerOptions,
  inFlight: InFlight,
): Promise<ApiResult> => {
  const pending = inFlight.get(key);
  if (pending !== undefined) {
    return pending;
  }

  const draw = async (): Promise<ApiResult> => {
    try {
      const result = await render(query, options.config);
      options.cache.set(key, result, ttlFor(result, options.cacheSeconds));
      return result;
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
  inFlight: InFlight,
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

  const render = CARD_ROUTES.get(path);
  if (!render) {
    // the site is claimed last, so no page can shadow a card or the health check
    return (
      (await options.site?.(url.pathname)) ??
      problem(404, 'not_found', 'No card is served at this path')
    );
  }

  // the request's own, for the header; `0` refuses the held copy as well
  const wanted = parseInteger(url.searchParams.get('cache_seconds')) ?? options.cacheSeconds;
  const key = cacheKey(path, url.searchParams);

  const hit = wanted === 0 ? undefined : options.cache.get(key);
  if (hit) {
    return cardResponse(hit.result, ttlFor(hit.result, wanted), hit.age, options.strictHttpStatus);
  }

  const query = Object.fromEntries(url.searchParams);
  const result = await drawCard(render, key, query, options, inFlight);

  return cardResponse(result, ttlFor(result, wanted), undefined, options.strictHttpStatus);
};

/**
 * The server, bound to what this deployment configured.
 *
 * @returns The handler: a `Request` in, a `Response` out.
 */
const createHandler = (options: ServerOptions) => {
  const inFlight: InFlight = new Map();

  return async (request: Request): Promise<Response> =>
    finish(request, await route(request, options, inFlight), options.corsOrigin);
};

export type { ServerOptions };

export { STRICT_STATUS, createHandler, problem };
