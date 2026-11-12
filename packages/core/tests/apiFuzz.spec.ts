/**
 * @file Every handler, fed query strings no one wrote by hand.
 *
 * The fetchers answer the shared samples, so a query the boundary lets through reaches the renderer:
 * a render-time throw surfaces as `upstream`, which no query string may cause.
 */

import * as fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import type { ApiResult } from '../src/api/api-result.ts';
import {
  contributedTo,
  gist,
  org,
  orgActivity,
  orgCalendar,
  pin,
  stats,
  topLangs,
  wakatime,
} from '../src/api/index.ts';
import type { ParamShape } from '../src/api/params.ts';
import type { CardConfig } from '../src/common/config.ts';
import { ORG_CALENDAR_MAX_WEEKS } from '../src/common/constants.ts';

import { testConfig } from './_config.ts';

// hoisted above the imports, so each factory imports its own sample
vi.mock(import('../src/fetchers/contributed-to/index.ts'), async (original) => {
  const actual = await original();
  const { contributedToData: sample } = await import('./_cards.ts');
  return {
    ...actual,
    fetchContributedTo: vi.fn<typeof actual.fetchContributedTo>().mockResolvedValue(sample),
  };
});
vi.mock(import('../src/fetchers/gist/index.ts'), async (original) => {
  const actual = await original();
  const { gistData: sample } = await import('./_cards.ts');
  return { ...actual, fetchGist: vi.fn<typeof actual.fetchGist>().mockResolvedValue(sample) };
});
vi.mock(import('../src/fetchers/org-activity/index.ts'), async (original) => {
  const actual = await original();
  const { orgActivityData: sample } = await import('./_cards.ts');
  return {
    ...actual,
    fetchOrgActivity: vi.fn<typeof actual.fetchOrgActivity>().mockResolvedValue(sample),
  };
});
vi.mock(import('../src/fetchers/org-calendar/index.ts'), async (original) => {
  const actual = await original();
  const { orgCalendarData: sample } = await import('./_cards.ts');
  return {
    ...actual,
    fetchOrgCalendar: vi.fn<typeof actual.fetchOrgCalendar>().mockResolvedValue(sample),
  };
});
vi.mock(import('../src/fetchers/organization/index.ts'), async (original) => {
  const actual = await original();
  const { organizationData: sample } = await import('./_cards.ts');
  return {
    ...actual,
    fetchOrganization: vi.fn<typeof actual.fetchOrganization>().mockResolvedValue(sample),
  };
});
vi.mock(import('../src/fetchers/repo/index.ts'), async (original) => {
  const actual = await original();
  const { repoData: sample } = await import('./_cards.ts');
  return { ...actual, fetchRepo: vi.fn<typeof actual.fetchRepo>().mockResolvedValue(sample) };
});
vi.mock(import('../src/fetchers/stats/index.ts'), async (original) => {
  const actual = await original();
  const { statsData: sample } = await import('./_cards.ts');
  return { ...actual, fetchStats: vi.fn<typeof actual.fetchStats>().mockResolvedValue(sample) };
});
vi.mock(import('../src/fetchers/top-languages/index.ts'), async (original) => {
  const actual = await original();
  const { topLangs: sample } = await import('./_cards.ts');
  return {
    ...actual,
    fetchTopLanguages: vi.fn<typeof actual.fetchTopLanguages>().mockResolvedValue(sample),
  };
});
vi.mock(import('../src/fetchers/wakatime/index.ts'), async (original) => {
  const actual = await original();
  const { wakaTimeData } = await import('./_wakatime.ts');
  const sample = wakaTimeData.data;
  return {
    ...actual,
    fetchWakatimeStats: vi.fn<typeof actual.fetchWakatimeStats>().mockResolvedValue(sample),
  };
});

type Handler = ((query: Record<string, string>, config: CardConfig) => Promise<ApiResult>) & {
  PARAMS: Readonly<Record<string, ParamShape>>;
};

/** Each handler, and a query that identifies a card it can draw. */
const HANDLERS: Array<[string, Handler, Record<string, string>]> = [
  ['stats', stats, { username: 'anuraghazra' }],
  ['top-langs', topLangs, { username: 'anuraghazra' }],
  ['pin', pin, { username: 'anuraghazra', repo: 'convoychat' }],
  ['contributed-to', contributedTo, { username: 'anuraghazra' }],
  ['org', org, { org: 'vitest-dev' }],
  ['org-activity', orgActivity, { org: 'vitest-dev' }],
  ['org-calendar', orgCalendar, { org: 'vitest-dev' }],
  ['gist', gist, { id: 'bbfce31e0217a3689c8d961a356cb10d' }],
  ['wakatime', wakatime, { username: 'anuraghazra' }],
];

/** Strings a hand-written query gets wrong: empty, signed, scientific, padded, cased, unicode. */
const NEAR_MISSES = [
  '',
  ' ',
  '-1',
  '0',
  '1e3',
  '5px',
  '1.5',
  'NaN',
  'TRUE',
  'yes',
  ',',
  '%00',
  'é',
];

/** Free-text params with a format of their own, which their kind cannot tell. */
const FORMATTED: Record<string, fc.Arbitrary<string>> = {
  from: fc.integer({ min: 2015, max: 2025 }).map(String),
  to: fc.integer({ min: 2015, max: 2025 }).map(String),
  scope: fc.constantFrom('anuraghazra/convoychat', 'anuraghazra/*'),
  wakatime_host: fc.constantFrom('wakatime.com', 'waka.example.com'),
  weeks: fc.integer({ min: 1, max: ORG_CALENDAR_MAX_WEEKS }).map(String),
};

/** @returns What the param accepts: the values a form would offer. */
const wellFormed = (name: string, { kind, choices = [] }: ParamShape): fc.Arbitrary<string> => {
  const formatted = FORMATTED[name];
  if (formatted !== undefined) {
    return formatted;
  }
  if (choices.length > 0 && kind === 'list') {
    return fc.subarray([...choices], { minLength: 1 }).map((list) => list.join(','));
  }
  if (choices.length > 0) {
    return fc.constantFrom(...choices);
  }
  if (kind === 'boolean') {
    return fc.constantFrom('true', 'false', '1', '0', 'on', 'off');
  }
  if (kind === 'integer' || kind === 'number') {
    return fc.integer({ min: 1, max: 2000 }).map(String);
  }
  if (kind === 'list') {
    return fc
      .array(fc.stringMatching(/^[a-z][\w-]{0,9}$/), { minLength: 1, maxLength: 3 })
      .map((list) => list.join(','));
  }
  return fc.string({ maxLength: 40 });
};

/** @returns Anything at all for one param, weighted towards what a hand-written query gets wrong. */
const anyValue = (name: string, shape: ParamShape): fc.Arbitrary<string> =>
  fc.oneof(
    wellFormed(name, shape),
    fc.constantFrom(...NEAR_MISSES),
    fc.integer({ min: -1000, max: 100_000 }).map(String),
    fc.string(),
  );

/** Only what the query string can be blamed for: a parse failure, never a crash. */
const QUERY_FAULTS = new Set(['invalid_param', 'missing_param']);

/** Fails unless the result is a card, or a refusal of the query naming a param it was sent. */
const expectDrawnOrRefused = (result: ApiResult, sent: ReadonlyArray<string>): void => {
  expect(result.content.startsWith('<svg')).toBe(true);
  if (result.status === 'error') {
    expect(QUERY_FAULTS).toContain(result.error.code);
    if (result.error.param !== undefined) {
      expect(sent).toContain(result.error.param);
    }
  }
};

describe.each(HANDLERS)('%s', (_name, handler, identity) => {
  const params = Object.entries(handler.PARAMS);

  it('draws any mix of well-formed options, or refuses one by name', async () => {
    const queries = fc
      .subarray(params)
      .chain((chosen) =>
        fc.tuple(
          ...chosen.map(([name, shape]) =>
            wellFormed(name, shape).map((value): [string, string] => [name, value]),
          ),
        ),
      )
      .map((entries) => Object.fromEntries(entries));
    // fast-check rejects with the shrunk counterexample
    await expect(
      fc.assert(
        fc.asyncProperty(queries, async (fuzzed) => {
          const query = { ...fuzzed, ...identity };
          const result = await handler(query, testConfig);

          expectDrawnOrRefused(result, Object.keys(query));
        }),
        { numRuns: 200 },
      ),
    ).resolves.toBeUndefined();
  });

  it('draws, or names the param, whatever one param holds', async () => {
    const queries = fc
      .constantFrom(...params)
      .chain(([name, shape]) => anyValue(name, shape).map((value) => ({ [name]: value })));
    await expect(
      fc.assert(
        fc.asyncProperty(queries, async (fuzzed) => {
          const result = await handler({ ...identity, ...fuzzed }, testConfig);

          expectDrawnOrRefused(result, Object.keys(fuzzed));
        }),
        { numRuns: 300 },
      ),
    ).resolves.toBeUndefined();
  });
});
