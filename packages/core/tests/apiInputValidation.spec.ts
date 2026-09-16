import { describe, expect, it } from 'vitest';

import type { ApiResult } from '../src/api/api-result.ts';
import { contributedTo } from '../src/api/contributed-to.ts';
import { gist } from '../src/api/gist.ts';
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
  // A WakaTime username is not a GitHub login, so it is only checked against the safe set.
  ['wakatime', 'username', (username) => wakatime({ username }, config)],
  ['gist', 'id', (id) => gist({ id }, config)],
  ['stats', 'repo', (repo) => stats({ repo }, config)],
  ['stats', 'owner', (owner) => stats({ owner }, config)],
  ['pin', 'repo', (repo) => pin({ repo }, config)],
];

/** Every endpoint whose `username` is a GitHub login. */
const githubUsernameEndpoints: Array<[string, (username: string) => Promise<ApiResult>]> = [
  ['top-langs', (username) => topLangs({ username }, config)],
  ['contributed-to', (username) => contributedTo({ username }, config)],
  ['stats', (username) => stats({ username }, config)],
  ['pin', (username) => pin({ username }, config)],
];

/** Both ends of the range, on each card that counts within one. */
const rangeParams: Array<[string, string, (value: string) => Promise<ApiResult>]> = [
  ['contributed-to', 'from', (from) => contributedTo({ username: 'user', from }, config)],
  ['contributed-to', 'to', (to) => contributedTo({ username: 'user', to }, config)],
  ['stats', 'from', (from) => stats({ username: 'user', from }, config)],
  ['stats', 'to', (to) => stats({ username: 'user', to }, config)],
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
    ['stats', (query) => stats(query, config)],
    ['contributed-to', (query) => contributedTo(query, config)],
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

  describe.each(rangeParams)('%s: %s', (_endpoint, param, send) => {
    it.each(['', 'abc', '1', '12', '20244', '2024.5', '-2024', '2024-13', '2023-02-29'])(
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
