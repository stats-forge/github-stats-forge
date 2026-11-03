import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CardError } from '../src/common/error.ts';
import { fetchOrgCalendar } from '../src/fetchers/org-calendar.ts';
import type { OrgCalendarQuery } from '../src/graphql/buildOrgCalendarDocument.ts';

import { testConfig } from './_config.ts';
import { FetchMock, GRAPHQL, graphqlBody } from './_fetch-mock.ts';
import type { GraphQLBody, GraphQLErrorBody } from './_fetch-mock.ts';

/**
 * The weeks as GitHub answers them, oldest first.
 *
 * @returns The response body.
 */
const answer = (
  counts: Array<number>,
  /** What each search matched — `PullRequest` is how a token refused issues is answered. */
  matched: 'Issue' | 'PullRequest' = 'PullRequest',
): GraphQLBody<OrgCalendarQuery> => ({
  data: {
    organization: { login: 'vitest-dev', name: 'Vitest' },
    ...Object.fromEntries(
      counts.map((count, index) => [
        `week_${String(index)}`,
        { issueCount: count, nodes: count > 0 ? [{ __typename: matched }] : [] },
      ]),
    ),
  },
});

const mock = new FetchMock();
const config = testConfig.with({ fetch: mock.fetch });

/** @returns The variables the GraphQL request carried. */
const sentVariables = (): Record<string, unknown> => graphqlBody(mock.history.post[0]).variables;

beforeEach(() => {
  // the newest week ends today, so the dates a search asks for are only assertable against a fixed one
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-12T11:30:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  mock.reset();
});

describe(fetchOrgCalendar, () => {
  it('returns a count per week, oldest first, the newest ending today', async () => {
    mock.onPost(GRAPHQL).reply(200, answer([4, 0, 9]));

    const data = await fetchOrgCalendar({ org: 'vitest-dev', weeks: 3 }, config);

    expect(data).toStrictEqual({
      login: 'vitest-dev',
      name: 'Vitest',
      count: 'prs_merged',
      weeks: [
        { from: new Date('2026-08-23T00:00:00Z'), to: new Date('2026-08-29T00:00:00Z'), count: 4 },
        { from: new Date('2026-08-30T00:00:00Z'), to: new Date('2026-09-05T00:00:00Z'), count: 0 },
        { from: new Date('2026-09-06T00:00:00Z'), to: new Date('2026-09-12T00:00:00Z'), count: 9 },
      ],
    });
    expect(mock.history.post).toHaveLength(1);
  });

  it('asks two months of weeks in one request, by default for merged pull requests', async () => {
    mock.onPost(GRAPHQL).reply(200, answer(Array.from({ length: 9 }, () => 1)));

    const data = await fetchOrgCalendar({ org: 'vitest-dev' }, config);

    expect(data.weeks).toHaveLength(9);
    expect(mock.history.post).toHaveLength(1);
    expect(sentVariables()).toMatchObject({
      login: 'vitest-dev',
      week_0: 'org:vitest-dev is:pr merged:2026-07-12..2026-07-18',
      week_8: 'org:vitest-dev is:pr merged:2026-09-06..2026-09-12',
    });
  });

  it.each([
    ['prs_opened', 'is:pr created'],
    ['issues_opened', 'is:issue created'],
    ['issues_closed', 'is:issue closed'],
  ] as const)('searches %s with %s', async (count, qualifier) => {
    mock.onPost(GRAPHQL).reply(200, answer([1], 'Issue'));

    await fetchOrgCalendar({ org: 'vitest-dev', count, weeks: 1 }, config);

    expect(sentVariables()['week_0']).toBe(`org:vitest-dev ${qualifier}:2026-09-06..2026-09-12`);
  });

  it('clamps the weeks to two months, and takes the default for an unparsed number', async () => {
    mock.onPost(GRAPHQL).reply(200, answer(Array.from({ length: 9 }, () => 0)));

    const clamped = await fetchOrgCalendar({ org: 'vitest-dev', weeks: 500 }, config);
    const unparsed = await fetchOrgCalendar({ org: 'vitest-dev', weeks: Number.NaN }, config);

    expect(clamped.weeks).toHaveLength(9);
    expect(unparsed.weeks).toHaveLength(9);
  });

  it('answers a search GitHub gave up on as an upstream failure', async () => {
    // a slow search is answered with a 502 page, not a GraphQL body
    mock.onPost(GRAPHQL).reply(502);

    await expect(fetchOrgCalendar({ org: 'vitest-dev' }, config)).rejects.toMatchObject({
      reason: 'graphql_failed',
    });
  });

  it('refuses issue counts that GitHub answered with pull requests', async () => {
    mock.onPost(GRAPHQL).reply(200, answer([3, 2], 'PullRequest'));

    await expect(
      fetchOrgCalendar({ org: 'vitest-dev', count: 'issues_closed', weeks: 2 }, config),
    ).rejects.toMatchObject({ reason: 'org_calendar_issues_forbidden' });
  });

  it('answers a login that is no organization as not found', async () => {
    mock.onPost(GRAPHQL).reply(200, {
      errors: [{ type: 'NOT_FOUND', message: 'Could not resolve to an Organization' }],
    } satisfies GraphQLErrorBody);

    await expect(fetchOrgCalendar({ org: 'nobody', weeks: 1 }, config)).rejects.toMatchObject({
      reason: 'org_not_found',
    });
  });

  it('refuses a missing or malformed login before any request', async () => {
    await expect(fetchOrgCalendar({ org: undefined }, config)).rejects.toThrow(CardError);
    await expect(fetchOrgCalendar({ org: 'not a login' }, config)).rejects.toMatchObject({
      reason: 'org_invalid',
    });
    expect(mock.history.post).toHaveLength(0);
  });
});
