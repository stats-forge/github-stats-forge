import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CardError, ISSUES_FORBIDDEN } from '../src/common/error.ts';
import { fetchOrgActivity } from '../src/fetchers/org-activity.ts';
import type { GetOrganizationActivityQuery } from '../src/graphql/generated/org-activity.ts';

import { testConfig } from './_config.ts';
import { FetchMock } from './_fetch-mock.ts';

const GRAPHQL = 'https://api.github.com/graphql';
const COMMIT_SEARCH = /^https:\/\/api\.github\.com\/search\/commits/;

/**
 * The counts as GitHub answers them.
 *
 * @returns The response body.
 */
const answer = ({
  prsOpened = 0,
  prsMerged = 0,
  issuesOpened = 0,
  issuesClosed = 0,
  discussions = 0,
  name = 'Vitest',
  /** What the issue searches matched — `PullRequest` is how a token refused issues is answered. */
  issueNode = 'Issue',
}: {
  prsOpened?: number;
  prsMerged?: number;
  issuesOpened?: number;
  issuesClosed?: number;
  discussions?: number;
  name?: string | null;
  issueNode?: 'Issue' | 'PullRequest';
} = {}): { data: GetOrganizationActivityQuery } => ({
  data: {
    organization: { login: 'vitest-dev', name },
    prsOpened: { issueCount: prsOpened },
    prsMerged: { issueCount: prsMerged },
    issuesOpened: {
      issueCount: issuesOpened,
      nodes: issuesOpened > 0 ? [{ __typename: issueNode }] : [],
    },
    issuesClosed: {
      issueCount: issuesClosed,
      nodes: issuesClosed > 0 ? [{ __typename: issueNode }] : [],
    },
    discussions: { discussionCount: discussions },
  },
});

const mock = new FetchMock();
const config = testConfig.with({ fetch: mock.fetch });

/** @returns The search queries the GraphQL request carried, keyed by their alias. */
const sentSearches = (): Record<string, string> =>
  (JSON.parse(mock.history.post[0]?.data ?? '{}') as { variables: Record<string, string> })
    .variables;

beforeEach(() => {
  // the window ends today, so the dates a search asks for are only assertable against a fixed one
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-12T11:30:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  mock.reset();
  vi.restoreAllMocks();
});

describe(fetchOrgActivity, () => {
  it('returns every count of one request, and no commits unless asked', async () => {
    mock.onPost(GRAPHQL).reply(
      200,
      answer({
        prsOpened: 267,
        prsMerged: 169,
        issuesOpened: 82,
        issuesClosed: 66,
        discussions: 9,
      }),
    );

    const data = await fetchOrgActivity({ org: 'vitest-dev' }, config);

    expect(data).toStrictEqual({
      login: 'vitest-dev',
      name: 'Vitest',
      range: { from: new Date('2026-08-14T00:00:00Z'), to: new Date('2026-09-12T00:00:00Z') },
      days: 30,
      prsOpened: 267,
      prsMerged: 169,
      issuesOpened: 82,
      issuesClosed: 66,
      discussionsOpened: 9,
      commits: null,
    });
    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.get).toHaveLength(0);
  });

  it('scopes each search to the organization and to the window', async () => {
    mock.onPost(GRAPHQL).reply(200, answer());

    await fetchOrgActivity({ org: 'vitest-dev' }, config);

    expect(sentSearches()).toMatchObject({
      login: 'vitest-dev',
      prsOpened: 'org:vitest-dev is:pr created:2026-08-14..2026-09-12',
      prsMerged: 'org:vitest-dev is:pr merged:2026-08-14..2026-09-12',
      issuesOpened: 'org:vitest-dev is:issue created:2026-08-14..2026-09-12',
      issuesClosed: 'org:vitest-dev is:issue closed:2026-08-14..2026-09-12',
      discussions: 'org:vitest-dev created:2026-08-14..2026-09-12',
    });
  });

  it('counts today alone for a window of one day', async () => {
    mock.onPost(GRAPHQL).reply(200, answer());

    const data = await fetchOrgActivity({ org: 'vitest-dev', days: 1 }, config);

    expect(sentSearches()['prsOpened']).toContain('created:2026-09-12..2026-09-12');
    expect(data.range.from).toStrictEqual(new Date('2026-09-12T00:00:00Z'));
  });

  it('clamps the window to a year', async () => {
    mock.onPost(GRAPHQL).reply(200, answer());

    const data = await fetchOrgActivity({ org: 'vitest-dev', days: 5000 }, config);

    expect(data.days).toBe(365);
    expect(sentSearches()['prsOpened']).toContain('created:2025-09-13..2026-09-12');
  });

  it('takes the default window when the query named an unparsed one', async () => {
    mock.onPost(GRAPHQL).reply(200, answer());

    const data = await fetchOrgActivity({ org: 'vitest-dev', days: Number.NaN }, config);

    expect(data.days).toBe(30);
  });

  it('searches commits separately when they are asked for', async () => {
    mock.onPost(GRAPHQL).reply(200, answer());
    mock.onGet(COMMIT_SEARCH).reply(200, { total_count: 204 });

    const data = await fetchOrgActivity({ org: 'vitest-dev', include_commits: true }, config);

    expect(data.commits).toBe(204);
    expect(mock.history.get[0]?.url).toContain(
      'q=org:vitest-dev+author-date:2026-08-14..2026-09-12',
    );
  });

  it('drops the commit count rather than the card when that search is refused', async () => {
    // silences the refusal the fetcher reports
    vi.spyOn(console, 'error').mockReturnValue();

    mock.onPost(GRAPHQL).reply(200, answer({ prsOpened: 12 }));
    mock.onGet(COMMIT_SEARCH).reply(200, { message: 'Validation Failed' });

    const data = await fetchOrgActivity({ org: 'vitest-dev', include_commits: true }, config);

    expect(data.commits).toBeNull();
    expect(data.prsOpened).toBe(12);
  });

  it('refuses the card when the issue searches answer with pull requests', async () => {
    mock.onPost(GRAPHQL).reply(
      200,
      answer({
        prsOpened: 157,
        prsMerged: 115,
        issuesOpened: 157,
        issuesClosed: 157,
        issueNode: 'PullRequest',
      }),
    );

    await expect(fetchOrgActivity({ org: 'vitest-dev' }, config)).rejects.toMatchObject({
      code: 'forbidden',
      secondaryMessage: ISSUES_FORBIDDEN,
    });
  });

  it('drops both issue counts instead, for a caller that wants neither row', async () => {
    // silences the refusal the fetcher reports, and is what asserts on it
    const logged = vi.spyOn(console, 'error').mockReturnValue();

    mock.onPost(GRAPHQL).reply(
      200,
      answer({
        prsOpened: 157,
        prsMerged: 115,
        issuesOpened: 157,
        issuesClosed: 157,
        issueNode: 'PullRequest',
      }),
    );

    const data = await fetchOrgActivity({ org: 'vitest-dev', require_issues: false }, config);

    expect(data.issuesOpened).toBeNull();
    expect(data.issuesClosed).toBeNull();
    // the pull request rows are answered honestly by the same token, so they stay
    expect(data.prsOpened).toBe(157);
    expect(data.prsMerged).toBe(115);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('may not read issues'));
  });

  it('keeps an issue count of zero, which has no node to check', async () => {
    mock.onPost(GRAPHQL).reply(200, answer({ issuesOpened: 4, issuesClosed: 0 }));

    await expect(fetchOrgActivity({ org: 'vitest-dev' }, config)).resolves.toMatchObject({
      issuesOpened: 4,
      issuesClosed: 0,
    });
  });

  it('falls back to the login when the organization has no display name', async () => {
    mock.onPost(GRAPHQL).reply(200, answer({ name: null }));

    await expect(fetchOrgActivity({ org: 'vitest-dev' }, config)).resolves.toMatchObject({
      name: 'vitest-dev',
    });
  });

  it('rejects a login that resolves to a user rather than an organization', async () => {
    mock.onPost(GRAPHQL).reply(200, {
      data: { organization: null },
      errors: [
        {
          type: 'NOT_FOUND',
          message: "Could not resolve to an Organization with the login of 'marcalexiei'.",
        },
      ],
    });

    await expect(fetchOrgActivity({ org: 'marcalexiei' }, config)).rejects.toMatchObject({
      code: 'not_found',
      secondaryMessage: 'Make sure the provided organization exists and is not a user',
    });
  });

  it('rejects any other refusal as upstream', async () => {
    vi.spyOn(console, 'error').mockReturnValue();

    mock.onPost(GRAPHQL).reply(200, {
      data: { organization: null },
      errors: [{ type: 'FORBIDDEN', message: 'Resource not accessible by integration' }],
    });

    await expect(fetchOrgActivity({ org: 'vitest-dev' }, config)).rejects.toMatchObject({
      code: 'upstream',
    });
  });

  it('rejects a malformed login before sending anything', async () => {
    await expect(fetchOrgActivity({ org: '-nope' }, config)).rejects.toBeInstanceOf(CardError);
    expect(mock.history.post).toHaveLength(0);
  });

  it('rejects a missing login', async () => {
    await expect(fetchOrgActivity({ org: undefined }, config)).rejects.toMatchObject({
      code: 'missing_param',
      param: 'org',
    });
  });
});
