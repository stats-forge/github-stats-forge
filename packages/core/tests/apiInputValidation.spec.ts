import { describe, expect, it } from 'vitest';

import type { ApiResult } from '../src/api/api-result.ts';
import { contributedTo } from '../src/api/contributed-to.ts';
import { gist } from '../src/api/gist.ts';
import { orgActivity } from '../src/api/org-activity.ts';
import { pin } from '../src/api/pin.ts';
import { stats } from '../src/api/stats.ts';
import { topLangs } from '../src/api/top-langs.ts';
import { wakatime } from '../src/api/wakatime.ts';
import { CardConfig } from '../src/common/config.ts';

// Values containing characters outside the safe set /^[-\w/.,]+$/. These must be
// rejected before any network request is made.
const unsafeValues = ['user name', 'user@evil.com', 'a<b', 'a?b', 'a:b', 'a&b'];

// Never reached: every case is rejected before a token would be used.
const config = new CardConfig({ pats: [{ name: 'PAT_1', value: 'token' }] });

/*
 * Each row sends the value as one param and nothing else,
 * so the rejection cannot be blamed on another param.
 */
const endpoints: Array<[string, string, (value: string) => Promise<ApiResult>]> = [
  ['gist', 'id', async (id) => gist({ id }, config)],
  ['pin', 'repo', async (repo) => pin({ repo }, config)],
];

/** Every endpoint whose `username` is a GitHub login. */
const githubUsernameEndpoints: Array<[string, (username: string) => Promise<ApiResult>]> = [
  ['top-langs', async (username) => topLangs({ username }, config)],
  ['contributed-to', async (username) => contributedTo({ username }, config)],
  ['stats', async (username) => stats({ username }, config)],
  ['pin', async (username) => pin({ username }, config)],
];

/** Both ends of the range, on each card that counts within one. */
const rangeParams: Array<[string, string, (value: string) => Promise<ApiResult>]> = [
  ['contributed-to', 'from', async (from) => contributedTo({ username: 'user', from }, config)],
  ['contributed-to', 'to', async (to) => contributedTo({ username: 'user', to }, config)],
  ['stats', 'from', async (from) => stats({ username: 'user', from }, config)],
  ['stats', 'to', async (to) => stats({ username: 'user', to }, config)],
  ['org-activity', 'from', async (from) => orgActivity({ org: 'org', from }, config)],
  ['org-activity', 'to', async (to) => orgActivity({ org: 'org', to }, config)],
];

// Within the safe set, but not logins GitHub can issue: a hyphen may not lead, trail or double.
const malformedUsernames = ['-user', 'user-', 'a--b', 'a'.repeat(40)];

describe('API input validation', () => {
  describe.each(endpoints)('%s: %s', (_endpoint, param, send) => {
    it.each(unsafeValues)(`rejects unsafe ${param} %j`, async (value) => {
      const result = await send(value);
      expect(result.status).toBe('error');
      expect(result.content).toContain('unsafe characters');
    });
  });

  // Not a GitHub login, but still one segment of the URL path it is fetched from.
  it.each([...unsafeValues, 'a/b', '..', '.'])('wakatime: rejects username %j', async (value) => {
    const result = await wakatime({ username: value }, config);
    expect(result).toMatchObject({
      status: 'error',
      error: { code: 'invalid_param', param: 'username' },
    });
  });

  it.each([
    'evil.com/path',
    'evil.com?x=',
    'evil.com#',
    'user@evil.com',
    'evil.com:80@internal',
    'evil.com/',
    'wakapi.dev:0',
    'wakapi.dev:65536',
    'wakapi.dev:99999',
    '-evil.com',
    'evil..com',
    String.raw`evil.com\x`,
  ])('wakatime: rejects wakatime_host %j', async (wakatime_host) => {
    const result = await wakatime({ username: 'user', wakatime_host }, config);
    expect(result).toMatchObject({
      status: 'error',
      retryable: false,
      error: { code: 'invalid_param', param: 'wakatime_host' },
    });
    expect(result.content).toContain(
      'Invalid hostname input for parameter &#34;wakatime_host&#34;',
    );
  });

  describe.each(githubUsernameEndpoints)('%s: username', (_endpoint, send) => {
    it.each([...unsafeValues, ...malformedUsernames])('rejects username %j', async (value) => {
      const result = await send(value);
      expect(result).toMatchObject({
        status: 'error',
        retryable: false,
        error: { code: 'invalid_param', param: 'username' },
      });
      // the error card html-escapes the quotes around the parameter name
      expect(result.content).toContain('Invalid username input for parameter &#34;username&#34;');
    });
  });

  const rangeEndpoints: Array<[string, (query: Record<string, string>) => Promise<ApiResult>]> = [
    ['stats', async (query) => stats(query, config)],
    ['contributed-to', async (query) => contributedTo(query, config)],
  ];

  it.each(rangeEndpoints)('%s: rejects a from after its to', async (_endpoint, send) => {
    const result = await send({ username: 'user', from: '2024', to: '2022' });

    expect(result).toMatchObject({
      status: 'error',
      retryable: false,
      error: { code: 'invalid_param', param: 'from' },
    });
    expect(result.content).toContain('Range &#34;from&#34; is after &#34;to&#34;');
  });

  it.each([
    'vitest',
    'a/b/c',
    'a b/c',
    'evil/<x>',
    Array.from({ length: 11 }, (_, index) => `o${index}/*`).join(','),
  ])('stats: rejects scope %j', async (scope) => {
    const result = await stats({ username: 'user', show: 'prs_opened', scope }, config);

    expect(result).toMatchObject({ error: { code: 'invalid_param', param: 'scope' } });
  });

  it('stats: rejects a scope when no search stat is drawn', async () => {
    const result = await stats({ username: 'user', scope: 'vitest-dev/*' }, config);

    expect(result).toMatchObject({ error: { code: 'invalid_param', param: 'scope' } });
    expect(result.content).toContain('applies only to stats counted by search');
  });

  it('org-activity: rejects days together with a range', async () => {
    const result = await orgActivity({ org: 'vitest-dev', days: '30', from: '2024' }, config);

    expect(result).toMatchObject({ error: { code: 'invalid_param', param: 'days' } });
    expect(result.content).toContain('cannot be combined with');
  });

  describe.each(rangeParams)('%s: %s', (_endpoint, param, send) => {
    it.each(['abc', '1', '12', '20244', '2024.5', '-2024', '2024-13', '2023-02-29'])(
      'rejects %j',
      async (value) => {
        const result = await send(value);

        expect(result).toMatchObject({
          status: 'error',
          retryable: false,
          error: { code: 'invalid_param', param },
        });
        // the error card html-escapes the quotes around the parameter name
        expect(result.content).toContain(`Invalid date input for parameter &#34;${param}&#34;`);
      },
    );

    // GitHub launched in 2008, and no contribution has been made in a later year than this one
    it.each(['2007-12-31', '3000'])('rejects out of range %j', async (value) => {
      const result = await send(value);

      expect(result).toMatchObject({ status: 'error', error: { code: 'invalid_param', param } });
      expect(result.content).toContain(`Out of range date for parameter &#34;${param}&#34;`);
    });
  });
});
