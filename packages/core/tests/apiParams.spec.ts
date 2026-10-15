import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ApiResult } from '../src/api/api-result.ts';
import { gist as gistApi } from '../src/api/gist.ts';
import { pin as pinApi } from '../src/api/pin.ts';
import { stats as statsApi } from '../src/api/stats.ts';
import { topLangs as topLangsApi } from '../src/api/top-langs.ts';
import { wakatime as wakatimeApi } from '../src/api/wakatime.ts';

import { testConfig } from './_config.ts';
import { FetchMock } from './_fetch-mock.ts';

// Nothing here is about fetching:
// every request fails immediately, so a query that got past validation is a temporary error.
const mock = new FetchMock();
const config = testConfig.with({ fetch: mock.fetch });

/** Every endpoint, called the way its own signature allows. */
const endpoints = {
  stats: (query: Record<string, string>): Promise<ApiResult> => statsApi(query, config),
  pin: (query: Record<string, string>): Promise<ApiResult> => pinApi(query, config),
  'top-langs': (query: Record<string, string>): Promise<ApiResult> => topLangsApi(query, config),
  gist: (query: Record<string, string>): Promise<ApiResult> => gistApi(query, config),
  wakatime: (query: Record<string, string>): Promise<ApiResult> => wakatimeApi(query, config),
};

const withUser = (endpoint: string): Record<string, string> =>
  endpoint === 'gist' ? { id: 'abc123' } : { username: 'anuraghazra' };

beforeAll(() => {
  mock.onAny().networkError();
});

afterAll(() => {
  mock.reset();
});

describe('api query schemas', () => {
  it.each(Object.entries(endpoints))(
    '%s rejects an unavailable locale with the same wording',
    async (name, call) => {
      const result = await call({ ...withUser(name), locale: 'xx' });

      expect(result.status).toBe('error');
      expect(result.content).toContain('Locale not found');
    },
  );

  it.each(Object.entries(endpoints))(
    '%s ignores params it does not declare',
    async (name, call) => {
      const result = await call({
        ...withUser(name),
        cache_seconds: '86400',
        // named after nothing, so it cannot go stale when something is renamed
        client: 'unknown',
        // a param another endpoint owns
        langs_count: '4',
      });

      // the stubbed fetch fails, so anything that got past validation is temporary
      expect(result.status).toBe('error');
    },
  );

  it.each(Object.entries(endpoints))(
    '%s reports the first invalid color by name',
    async (name, call) => {
      const result = await call({
        ...withUser(name),
        title_color: 'not-a-color',
        bg_color: 'also-not-a-color',
      });

      expect(result.status).toBe('error');
      expect(result.content).toContain('Invalid color input for parameter &#34;title_color&#34;');
    },
  );

  it('rejects a malformed number by naming the param', async () => {
    const result = await endpoints.stats({
      username: 'anuraghazra',
      border_radius: 'abc',
    });

    expect(result.status).toBe('error');
    expect(result.content).toContain('Invalid number input for parameter &#34;border_radius&#34;');
  });

  it('keeps the coercion the card performs, so 10px is 10', async () => {
    const result = await endpoints.stats({
      username: 'anuraghazra',
      border_radius: '10px',
    });

    // the stubbed fetch fails, but the param got past validation
    expect(result.status).toBe('error');
  });

  it.each(['card_width', 'line_height'])(
    'rejects a %s with no number in it by naming the param',
    async (param) => {
      const result = await endpoints.stats({ username: 'anuraghazra', [param]: 'abc' });

      expect(result).toMatchObject({ status: 'error', error: { code: 'invalid_param', param } });
      expect(result.content).toContain(`Invalid number input for parameter &#34;${param}&#34;`);
    },
  );

  it('reads an integer the way parseInt does, so 500px is 500', async () => {
    const result = await endpoints.stats({ username: 'anuraghazra', card_width: '500px' });

    // the stubbed fetch fails, but the param got past validation
    expect(result).toMatchObject({ status: 'error', error: { code: 'upstream' } });
  });

  it.each([
    ['show', 'prs_merged,stars'],
    ['hide', 'stars,sparkles'],
    ['role', 'owner,stranger'],
  ])('rejects a %s naming something outside its set', async (param, value) => {
    const result = await endpoints.stats({ username: 'anuraghazra', [param]: value });

    expect(result).toMatchObject({ status: 'error', error: { code: 'invalid_param', param } });
    expect(result.content).toContain(`Incorrect ${param} input`);
  });

  it('reads a list typed with spaces and a trailing comma', async () => {
    const result = await endpoints.stats({
      username: 'anuraghazra',
      show: 'prs_merged, reviews,',
      repo: 'a, b',
    });

    // the stubbed fetch fails, but the params got past validation
    expect(result).toMatchObject({ status: 'error', error: { code: 'upstream' } });
  });

  it('matches a closed list case-insensitively', async () => {
    const result = await endpoints.stats({
      username: 'anuraghazra',
      show: 'PRS_MERGED',
      role: 'owner,Collaborator',
    });

    // the stubbed fetch fails, but the params got past validation
    expect(result).toMatchObject({ status: 'error', error: { code: 'upstream' } });
  });

  it.each(['yes', '1', ''])('rejects the boolean %j by naming the param', async (value) => {
    const result = await endpoints.stats({ username: 'anuraghazra', show_icons: value });

    expect(result).toMatchObject({ error: { code: 'invalid_param', param: 'show_icons' } });
    expect(result.content).toContain('Invalid boolean input for parameter &#34;show_icons&#34;');
  });

  it.each([
    ['theme', 'not_a_theme'],
    // inherited from Object.prototype, which an `in` check once let through
    ['theme', 'toString'],
    ['theme_dark', 'nope'],
    ['number_format', 'medium'],
  ])('rejects the %s %j', async (param, value) => {
    const result = await endpoints.stats({ username: 'anuraghazra', [param]: value });

    expect(result).toMatchObject({ error: { code: 'invalid_param', param } });
    expect(result.content).toContain(`Incorrect ${param} input`);
  });

  it('matches booleans and fixed values case-insensitively', async () => {
    const result = await endpoints['top-langs']({
      username: 'anuraghazra',
      hide_title: 'TRUE',
      layout: 'Donut',
      theme: 'Dark',
    });

    // the stubbed fetch fails, but the params got past validation
    expect(result).toMatchObject({ status: 'error', error: { code: 'upstream' } });
  });

  it.each([
    ['layout', 'sideways', 'Incorrect layout input'],
    ['stats_format', 'kilobytes', 'Incorrect stats_format input'],
  ])('rejects an unrenderable %s', async (param, value, message) => {
    const result = await endpoints['top-langs']({
      username: 'anuraghazra',
      [param]: value,
    });

    expect(result.status).toBe('error');
    expect(result.content).toContain(message);
  });
});
