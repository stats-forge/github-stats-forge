import { describe, expect, it } from 'vitest';

import { readSettings } from '../src/config.ts';
import { DEFAULT_HOST, DEFAULT_PORT } from '../src/health.ts';

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

  it('answers with real status codes only when asked to', () => {
    expect(readSettings({}).options.strictHttpStatus).toBe(false);
    expect(readSettings({ STRICT_HTTP_STATUS: 'true' }).options.strictHttpStatus).toBe(true);
  });
});
