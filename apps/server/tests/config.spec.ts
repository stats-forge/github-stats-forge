import type { ApiResult } from '@stats-forge/github-stats-forge-core/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readSettings } from '../src/config.ts';
import { DEFAULT_HOST, DEFAULT_PORT } from '../src/health.ts';

const success: ApiResult = { status: 'success', content: '<svg />' };

afterEach(() => {
  vi.useRealTimers();
});

describe(readSettings, () => {
  it('defaults to the port and host the image exposes', () => {
    const settings = readSettings({});

    expect(settings.port).toBe(DEFAULT_PORT);
    expect(settings.host).toBe(DEFAULT_HOST);
  });

  it('reads CACHE_SECONDS as the one switch, unset by default', () => {
    expect(readSettings({}).options.cacheSeconds).toBeUndefined();
    expect(readSettings({ CACHE_SECONDS: '0' }).options.cacheSeconds).toBe(0);
  });

  // `docker compose` writes `""` for every `${VAR:-}` it has no value for
  it('reads a variable set to nothing as one that is not set', () => {
    const settings = readSettings({ CACHE_SECONDS: '', CORS_ORIGIN: '', HOST: '' });

    expect(settings.options.cacheSeconds).toBeUndefined();
    expect(settings.options.corsOrigin).toBeUndefined();
    expect(settings.host).toBe(DEFAULT_HOST);
  });

  it('falls back from a number that is not one, rather than reading it as 0', () => {
    const settings = readSettings({ CACHE_SECONDS: 'soon', PORT: 'any' });

    expect(settings.options.cacheSeconds).toBeUndefined();
    expect(settings.port).toBe(DEFAULT_PORT);
  });

  it('drops a token that is only a name, so the pool spends no retry on it', () => {
    const settings = readSettings({ PAT_1: 'real', PAT_2: '' });

    expect(settings.options.config.pats.map((pat) => pat.name)).toStrictEqual(['PAT_1']);
  });

  it('gives each GitHub request 10 seconds unless REQUEST_TIMEOUT_MS says otherwise', () => {
    expect(readSettings({}).options.config.requestTimeoutMs).toBe(10_000);
    expect(readSettings({ REQUEST_TIMEOUT_MS: '2500' }).options.config.requestTimeoutMs).toBe(2500);
  });

  it('answers with real status codes only when asked to', () => {
    expect(readSettings({}).options.strictHttpStatus).toBe(false);
    expect(readSettings({ STRICT_HTTP_STATUS: 'true' }).options.strictHttpStatus).toBe(true);
  });

  it('keeps the last good card a day past its TTL unless STALE_SECONDS says otherwise', () => {
    vi.useFakeTimers();
    const kept = readSettings({}).options.cache;
    const none = readSettings({ STALE_SECONDS: '0' }).options.cache;
    kept.set('k', success, 60);
    none.set('k', success, 60);

    vi.advanceTimersByTime(61_000);

    expect(kept.getStale('k')).toBeDefined();
    expect(none.getStale('k')).toBeUndefined();
  });
});
