import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ApiResult } from '../src/api/api-result.ts';
import { gist as gistApi } from '../src/api/gist.ts';
import { resolveEmpty } from '../src/api/params.ts';
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

  it.each([
    ['stats', 'card_width', '-200'],
    ['stats', 'card_width', '0'],
    ['stats', 'card_width', '1e3'],
    ['stats', 'line_height', '25px'],
    ['stats', 'line_height', '9'.repeat(400)],
    ['stats', 'number_precision', '-1'],
    ['stats', 'border_radius', '-4'],
    ['top-langs', 'langs_count', '5abc'],
    ['top-langs', 'langs_count', '2.5'],
    ['top-langs', 'size_weight', '0.5px'],
  ] as const)('%s rejects %s %j', async (endpoint, param, value) => {
    const result = await endpoints[endpoint]({ username: 'anuraghazra', [param]: value });

    expect(result).toMatchObject({ error: { code: 'invalid_param', param } });
  });

  it.each([
    ['stats', 'card_width', '500PX'],
    ['stats', 'number_precision', '0'],
    ['stats', 'border_radius', '4.5px'],
    ['top-langs', 'size_weight', '.5'],
    ['top-langs', 'count_weight', '0'],
  ] as const)('%s accepts %s %j', async (endpoint, param, value) => {
    const result = await endpoints[endpoint]({ username: 'anuraghazra', [param]: value });

    // the stubbed fetch fails, but the param got past validation
    expect(result).toMatchObject({ error: { code: 'upstream' } });
  });

  it('reads an integer the way parseInt does, so 500px is 500', async () => {
    const result = await endpoints.stats({ username: 'anuraghazra', card_width: '500px' });

    // the stubbed fetch fails, but the param got past validation
    expect(result).toMatchObject({ status: 'error', error: { code: 'upstream' } });
  });

  it.each([
    ['show', 'prs_merged,sparkles'],
    ['hide', 'stars,sparkles'],
    ['affiliation', 'owner,stranger'],
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

  it('takes any stat in either list, whatever its default', async () => {
    const result = await endpoints.stats({
      username: 'anuraghazra',
      show: 'stars,reviews',
      hide: 'reviews,contributed_to',
    });

    // the stubbed fetch fails, but the params got past validation
    expect(result).toMatchObject({ status: 'error', error: { code: 'upstream' } });
  });

  it('matches a closed list case-insensitively', async () => {
    const result = await endpoints.stats({
      username: 'anuraghazra',
      show: 'PRS_MERGED',
      affiliation: 'owner,Collaborator',
    });

    // the stubbed fetch fails, but the params got past validation
    expect(result).toMatchObject({ status: 'error', error: { code: 'upstream' } });
  });

  it.each(['yes', '1'])('rejects the boolean %j by naming the param', async (value) => {
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

  it('resolves an empty value by the kind of its param', () => {
    expect(
      resolveEmpty({ hide_border: '', theme: '', card_width: '', username: 'x' }, statsApi.PARAMS),
    ).toStrictEqual({ hide_border: 'true', username: 'x' });
  });

  it('reads an empty boolean as a flag that is set, and any other empty param as absent', async () => {
    const result = await endpoints.stats({
      username: 'anuraghazra',
      hide_border: '',
      theme: '',
      card_width: '',
      show: '',
      from: '',
    });

    // the stubbed fetch fails, but the params got past validation
    expect(result).toMatchObject({ status: 'error', error: { code: 'upstream' } });
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
    ['value_format', 'kilobytes', 'Incorrect value_format input'],
  ])('rejects an unrenderable %s', async (param, value, message) => {
    const result = await endpoints['top-langs']({
      username: 'anuraghazra',
      [param]: value,
    });

    expect(result.status).toBe('error');
    expect(result.content).toContain(message);
  });
});
