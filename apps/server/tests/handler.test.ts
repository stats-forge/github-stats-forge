import type { ErrorCode } from '@stats-forge/github-stats-forge-core/api';
import { describe, expect, it, vi } from 'vitest';

import { MAX_CACHE_SECONDS, MIN_CACHE_SECONDS, TTL } from '../src/cache.ts';
import { STRICT_STATUS, createHandler } from '../src/handler.ts';
import type { ServerOptions } from '../src/handler.ts';

import {
  GIST_ID,
  GIST_NOT_FOUND_REPLY,
  GIST_REPLY,
  RATE_LIMITED_REPLY,
  optionsAnswering,
  testCache,
  testOptions,
} from './_fake-github.ts';

/** The gist card is the cheapest success here: one GraphQL call, and a small reply. */
const GIST_URL = `http://localhost/api/gist?id=${GIST_ID}`;

/**
 * @returns The answer to one request, with the handler bound to `options`.
 */
const get = (url: string, options: ServerOptions, method = 'GET'): Promise<Response> =>
  createHandler(options)(new Request(url, { method }));

describe('routing', () => {
  it('answers a path no card is served at with JSON, not a card', async () => {
    const response = await get('http://localhost/api/nothing', testOptions());

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    await expect(response.json()).resolves.toMatchObject({ error: 'not_found' });
  });

  it('resolves a trailing slash to the same card', async () => {
    const { options } = optionsAnswering(GIST_NOT_FOUND_REPLY);
    const response = await get(`http://localhost/api/gist/?id=${GIST_ID}`, options);

    expect(response.headers.get('card-error-code')).toBe('not_found');
  });

  it('answers the health check without drawing anything', async () => {
    const response = await get('http://localhost/healthz', testOptions());

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toStrictEqual({ status: 'ok' });
  });

  it('rejects a URL longer than the cap', async () => {
    const response = await get(`${GIST_URL}&theme=${'a'.repeat(5000)}`, testOptions());

    expect(response.status).toBe(414);
  });
});

describe('methods', () => {
  it('answers anything but GET and HEAD with 405 and an Allow header', async () => {
    const response = await get(GIST_URL, testOptions(), 'POST');

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
  });

  it('gives HEAD the headers and no body', async () => {
    const { options } = optionsAnswering(GIST_REPLY);
    const response = await get(GIST_URL, options, 'HEAD');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    expect(Number(response.headers.get('content-length'))).toBeGreaterThan(0);
    await expect(response.text()).resolves.toBe('');
  });
});

describe('a drawn card', () => {
  it('is an SVG that will not be sniffed as anything else', async () => {
    const { options } = optionsAnswering(GIST_REPLY);
    const response = await get(GIST_URL, options);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toBe(
      "default-src 'none'; style-src 'unsafe-inline'",
    );
    expect(response.headers.get('card-status')).toBe('success');
    expect(body).toContain('<svg');
  });

  it('keeps for ten hours', async () => {
    const { options } = optionsAnswering(GIST_REPLY);
    const response = await get(GIST_URL, options);

    expect(response.headers.get('cache-control')).toBe(
      `max-age=${TTL.success}, s-maxage=${TTL.success}, stale-while-revalidate=86400`,
    );
  });
});

describe('a failure', () => {
  it('names the missing param in a header rather than only in the image', async () => {
    const response = await get('http://localhost/api/gist', testOptions());

    expect(response.status).toBe(200);
    expect(response.headers.get('card-status')).toBe('error');
    expect(response.headers.get('card-error-code')).toBe('missing_param');
    expect(response.headers.get('card-error-param')).toBe('id');
  });

  it('names the param a malformed value came from', async () => {
    const response = await get(`${GIST_URL}&border_radius=abc`, testOptions());

    expect(response.headers.get('card-error-code')).toBe('invalid_param');
    expect(response.headers.get('card-error-param')).toBe('border_radius');
  });

  it('reports a deployment with no token', async () => {
    const { options } = optionsAnswering(GIST_REPLY);
    const response = await get(GIST_URL, { ...options, config: options.config.with({ pats: [] }) });

    expect(response.headers.get('card-error-code')).toBe('no_tokens');
  });

  it('still answers with the drawn error card', async () => {
    const response = await get('http://localhost/api/gist', testOptions());

    expect(response.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    await expect(response.text()).resolves.toContain('<svg');
  });

  it('keeps a permanent one for an hour, so a broken query costs one render', async () => {
    const { options } = optionsAnswering(GIST_NOT_FOUND_REPLY);
    const response = await get(GIST_URL, options);

    expect(response.headers.get('card-error-code')).toBe('not_found');
    expect(response.headers.get('cache-control')).toContain(`max-age=${TTL.permanentError}`);
  });

  it('keeps a retryable one for ten minutes, because it may fix itself', async () => {
    const { options } = optionsAnswering(new Error('Network Error'));
    const response = await get(GIST_URL, options);

    expect(response.headers.get('card-error-code')).toBe('upstream');
    expect(response.headers.get('cache-control')).toContain(`max-age=${TTL.retryableError}`);
  });
});

/** One case per code the gist endpoint can be made to produce, with what produces it. */
const STRICT_CASES: ReadonlyArray<{ code: ErrorCode; url: string; reply: unknown }> = [
  { code: 'missing_param', url: 'http://localhost/api/gist', reply: GIST_REPLY },
  { code: 'invalid_param', url: `${GIST_URL}&border_radius=abc`, reply: GIST_REPLY },
  { code: 'not_found', url: GIST_URL, reply: GIST_NOT_FOUND_REPLY },
  { code: 'upstream', url: GIST_URL, reply: new Error('Network Error') },
];

describe('STRICT_HTTP_STATUS', () => {
  it.each(STRICT_CASES)('maps $code to the status it deserves', async ({ code, url, reply }) => {
    const { options } = optionsAnswering(reply, { strictHttpStatus: true });
    const response = await get(url, options);

    expect(response.headers.get('card-error-code')).toBe(code);
    expect(response.status).toBe(STRICT_STATUS[code]);
  });

  it('tells a caller when to come back from any retryable failure', async () => {
    const { options } = optionsAnswering(new Error('Network Error'), { strictHttpStatus: true });
    const response = await get(GIST_URL, options);

    expect(response.status).toBe(502);
    expect(response.headers.get('retry-after')).toBe(String(TTL.retryableError));
  });

  it('tells a rate-limited caller when to come back', async () => {
    // silences the spent token the retryer logs
    vi.spyOn(console, 'log').mockReturnValue();

    const { options } = optionsAnswering(RATE_LIMITED_REPLY, { strictHttpStatus: true });
    const response = await get(GIST_URL, options);

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe(String(TTL.retryableError));

    vi.restoreAllMocks();
  });

  it('is off by default, so a README shows the error card rather than a broken image', async () => {
    const response = await get('http://localhost/api/gist', testOptions());

    expect(response.status).toBe(200);
  });
});

/** What `ALLOWLIST=marcalexiei` builds: an instance that draws one account's cards. */
const pinnedTo = (options: ServerOptions): ServerOptions => ({
  ...options,
  config: options.config.with({ usernameAllowlist: ['marcalexiei'] }),
});

describe('a pinned instance', () => {
  it('refuses an account it does not serve, and says so in the header', async () => {
    const { options, github } = optionsAnswering(GIST_REPLY);
    const response = await get(
      'http://localhost/api/stats?username=someone-else',
      pinnedTo(options),
    );

    expect(response.headers.get('card-status')).toBe('error');
    expect(response.headers.get('card-error-code')).toBe('not_allowed');
    expect(response.headers.get('card-error-param')).toBe('username');
    expect(github.calls).toHaveLength(0);
  });

  it('is a 403 under STRICT_HTTP_STATUS, the query being fine and the instance pinned', async () => {
    const { options } = optionsAnswering(GIST_REPLY, { strictHttpStatus: true });
    const response = await get(
      'http://localhost/api/stats?username=someone-else',
      pinnedTo(options),
    );

    expect(response.status).toBe(403);
  });

  it('keeps the refusal for an hour, a query that will not fix itself', async () => {
    const { options } = optionsAnswering(GIST_REPLY);
    const response = await get(
      'http://localhost/api/stats?username=someone-else',
      pinnedTo(options),
    );

    expect(response.headers.get('cache-control')).toContain(`max-age=${TTL.permanentError}`);
  });

  it('leaves the wakatime card open, its username being another service’s', async () => {
    const { options, github } = optionsAnswering(new Error('Network Error'));
    const response = await get(
      'http://localhost/api/wakatime?username=someone-else',
      pinnedTo(options),
    );

    expect(response.headers.get('card-error-code')).toBe('upstream');
    expect(github.calls).not.toHaveLength(0);
  });
});

describe('cache_seconds', () => {
  it('clamps a success below the minimum up to it', async () => {
    const { options } = optionsAnswering(GIST_REPLY);
    const response = await get(`${GIST_URL}&cache_seconds=1`, options);

    expect(response.headers.get('cache-control')).toContain(`max-age=${MIN_CACHE_SECONDS}`);
  });

  it('clamps a success above the maximum down to it', async () => {
    const { options } = optionsAnswering(GIST_REPLY);
    const response = await get(`${GIST_URL}&cache_seconds=999999`, options);

    expect(response.headers.get('cache-control')).toContain(`max-age=${MAX_CACHE_SECONDS}`);
  });

  it("ignores a value that is not a number, being the server's param and not a card's", async () => {
    const { options } = optionsAnswering(GIST_REPLY);
    const response = await get(`${GIST_URL}&cache_seconds=soon`, options);

    expect(response.headers.get('cache-control')).toContain(`max-age=${TTL.success}`);
  });

  it('sends no-store when CACHE_SECONDS turned caching off', async () => {
    const { options } = optionsAnswering(GIST_REPLY, { cacheSeconds: 0 });
    const response = await get(GIST_URL, options);

    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

describe('the in-process cache', () => {
  it('makes two identical requests one GitHub request', async () => {
    const { options, github } = optionsAnswering(GIST_REPLY, { cache: testCache() });

    const first = await get(GIST_URL, options);
    const second = await get(GIST_URL, options);
    const drawn = await first.text();

    expect(github.calls).toHaveLength(1);
    expect(first.headers.get('card-cache')).toBe('miss');
    expect(second.headers.get('card-cache')).toBe('hit');
    await expect(second.text()).resolves.toBe(drawn);
  });

  it('keys on what was asked, so cache_seconds does not split the entry', async () => {
    const { options, github } = optionsAnswering(GIST_REPLY, { cache: testCache() });

    await get(GIST_URL, options);
    const second = await get(`${GIST_URL}&cache_seconds=20000`, options);

    expect(github.calls).toHaveLength(1);
    expect(second.headers.get('cache-control')).toContain('max-age=20000');
  });

  it('draws a different query again', async () => {
    const { options, github } = optionsAnswering(GIST_REPLY, { cache: testCache() });

    await get(GIST_URL, options);
    await get(`${GIST_URL}&theme=dark`, options);

    expect(github.calls).toHaveLength(2);
  });

  it('is skipped by cache_seconds=0, so a no-store answer is never a held one', async () => {
    const { options, github } = optionsAnswering(GIST_REPLY);

    await get(GIST_URL, options);
    const second = await get(`${GIST_URL}&cache_seconds=0`, options);

    expect(github.calls).toHaveLength(2);
    expect(second.headers.get('card-cache')).toBe('miss');
    expect(second.headers.get('cache-control')).toBe('no-store');
  });

  it('holds an answer for the default lifetime, whatever the request that drew it asked', async () => {
    vi.useFakeTimers();
    const { options, github } = optionsAnswering(GIST_REPLY);

    await get(`${GIST_URL}&cache_seconds=${MIN_CACHE_SECONDS}`, options);
    vi.advanceTimersByTime((MIN_CACHE_SECONDS + 60) * 1000);
    const later = await get(GIST_URL, options);

    expect(github.calls).toHaveLength(1);
    expect(later.headers.get('card-cache')).toBe('hit');

    vi.useRealTimers();
  });

  it('draws once for requests that arrive while the first is still drawing', async () => {
    const { options, github } = optionsAnswering(GIST_REPLY);
    // one handler: the in-flight table is the process's, not the request's
    const handler = createHandler(options);

    const [first, second] = await Promise.all([
      handler(new Request(GIST_URL)),
      handler(new Request(GIST_URL)),
    ]);

    expect(github.calls).toHaveLength(1);
    expect(first.headers.get('card-cache')).toBe('miss');
    expect(second.headers.get('card-cache')).toBe('miss');
    await expect(second.text()).resolves.toBe(await first.text());
  });

  it('reports the age of what it held, so a hit does not claim a full life', async () => {
    vi.useFakeTimers();
    const { options } = optionsAnswering(GIST_REPLY, { cache: testCache() });

    const first = await get(GIST_URL, options);
    vi.advanceTimersByTime(60_000);
    const second = await get(GIST_URL, options);

    expect(first.headers.get('age')).toBeNull();
    expect(second.headers.get('age')).toBe('60');

    vi.useRealTimers();
  });
});

describe('CORS', () => {
  it('is off by default, a card in a README needing none', async () => {
    const { options } = optionsAnswering(GIST_REPLY);
    const response = await get(GIST_URL, options);

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('exposes the card headers, without which a reader cannot tell an error card from a card', async () => {
    const { options } = optionsAnswering(GIST_REPLY, { corsOrigin: 'https://example.test' });
    const response = await get(GIST_URL, options);

    expect(response.headers.get('access-control-allow-origin')).toBe('https://example.test');
    expect(response.headers.get('access-control-expose-headers')).toContain('Card-Error-Code');
  });
});
