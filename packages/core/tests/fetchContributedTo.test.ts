import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardConfig } from '../src/common/config.ts';
import type { GraphQLResponse } from '../src/common/http.ts';
import { fetchContributedTo } from '../src/fetchers/contributed-to.ts';
import type { UserContributionYearsQuery } from '../src/graphql/generated/contributed-to.ts';
import type { ReposContributedToQuery } from '../src/graphql/reposContributedToDocument.ts';

import { FetchMock } from './_fetch-mock.ts';

vi.mock(import('../src/common/log.js'), async () => {
  const { createLoggerMock } = await import('./utils.js');
  return createLoggerMock();
});

/** Body of a GraphQL response, as the mocked endpoint returns it. */
type GraphQLBody<TResult> = GraphQLResponse<TResult>['data'];

const years: GraphQLBody<UserContributionYearsQuery> = {
  data: {
    user: {
      login: 'AnuragHazra',
      contributionsCollection: { contributionYears: [2024, 2022] },
    },
  },
};

/**
 * `range_0` is 2022 and `range_1` is 2024, in the order the years are sorted into.
 * `org/repo1` appears in both, so it exercises the merge; `AnuragHazra/own` is the user's own.
 */
const repos: GraphQLBody<ReposContributedToQuery> = {
  data: {
    user: {
      range_0: {
        commitContributionsByRepository: [
          { repository: { nameWithOwner: 'org/repo1' }, contributions: { totalCount: 10 } },
        ],
        issueContributionsByRepository: [
          { repository: { nameWithOwner: 'other/repo2' }, contributions: { totalCount: 40 } },
        ],
        pullRequestContributionsByRepository: [],
      },
      range_1: {
        commitContributionsByRepository: [
          { repository: { nameWithOwner: 'org/repo1' }, contributions: { totalCount: 25 } },
          { repository: { nameWithOwner: 'AnuragHazra/own' }, contributions: { totalCount: 99 } },
        ],
        issueContributionsByRepository: [],
        pullRequestContributionsByRepository: [],
      },
    },
  },
};

const mock = new FetchMock();
const config = new CardConfig({
  pats: [{ name: 'PAT_1', value: 'dummyPAT1' }],
  fetch: mock.fetch,
});

/** Answers the years query first, then every range query. */
const mockGraphQL = (): void => {
  mock.onPost('https://api.github.com/graphql').reply((request) => {
    const { query } = JSON.parse(request.data ?? '{}') as { query: string };
    return [200, query.includes('userContributionYears') ? years : repos];
  });
};

describe('test fetchContributedTo', () => {
  beforeEach(() => {
    mock.reset();
    mockGraphQL();
  });

  it('should rank repositories by their contributions, most first', async () => {
    const data = await fetchContributedTo({ username: 'anuraghazra' }, config);

    expect(data.repos.map((repo) => repo.nameWithOwner)).toStrictEqual([
      'other/repo2',
      'org/repo1',
    ]);
    // 10 in 2022 plus 25 in 2024
    expect(data.repos[1]?.contributions).toBe(35);
  });

  it('should collect the years a repository was contributed to, ascending', async () => {
    const data = await fetchContributedTo({ username: 'anuraghazra' }, config);

    expect(data.repos[1]?.years).toStrictEqual([2022, 2024]);
    expect(data.years).toStrictEqual([2022, 2024]);
  });

  it('should leave the user their own repositories out by default', async () => {
    const data = await fetchContributedTo({ username: 'anuraghazra' }, config);

    expect(data.repos.map((repo) => repo.nameWithOwner)).not.toContain('AnuragHazra/own');
    expect(data.totalRepos).toBe(2);
  });

  it('should keep them when asked, matching GitHub casing rather than the query param', async () => {
    const data = await fetchContributedTo(
      { username: 'anuraghazra', include_own_repos: true },
      config,
    );

    expect(data.repos[0]?.nameWithOwner).toBe('AnuragHazra/own');
    expect(data.totalRepos).toBe(3);
  });

  it('should count every repository found, not just the ranked slice', async () => {
    const data = await fetchContributedTo({ username: 'anuraghazra', repos_count: 1 }, config);

    expect(data.repos).toHaveLength(1);
    expect(data.totalRepos).toBe(2);
  });

  it('should fall back to the default count when the param did not parse', async () => {
    const data = await fetchContributedTo(
      { username: 'anuraghazra', repos_count: Number.NaN },
      config,
    );

    expect(data.repos).toHaveLength(2);
  });

  it('should exclude a repository named in full, and stop counting it in the total', async () => {
    const data = await fetchContributedTo(
      { username: 'anuraghazra', exclude_repo: ['other/repo2'] },
      config,
    );

    expect(data.repos.map((repo) => repo.nameWithOwner)).toStrictEqual(['org/repo1']);
    expect(data.totalRepos).toBe(1);
  });

  it('should exclude one named without its owner, whatever the casing', async () => {
    const data = await fetchContributedTo(
      { username: 'anuraghazra', exclude_repo: ['REPO2'] },
      config,
    );

    expect(data.repos.map((repo) => repo.nameWithOwner)).toStrictEqual(['org/repo1']);
  });

  it("should honour the deployment's own exclusions alongside the query's", async () => {
    const excludingConfig = new CardConfig({
      pats: [{ name: 'PAT_1', value: 'dummyPAT1' }],
      excludeRepositories: ['repo1'],
      fetch: mock.fetch,
    });

    const data = await fetchContributedTo(
      { username: 'anuraghazra', exclude_repo: ['other/repo2'] },
      excludingConfig,
    );

    expect(data.repos).toStrictEqual([]);
    expect(data.totalRepos).toBe(0);
  });

  it('should report a missing username as a missing param', async () => {
    await expect(fetchContributedTo({ username: undefined }, config)).rejects.toThrow(
      'Missing params',
    );
  });

  it('should report an unknown user as not found', async () => {
    mock.reset();
    mock.onPost('https://api.github.com/graphql').reply(200, {
      data: { user: null },
      errors: [
        { type: 'NOT_FOUND', message: "Could not resolve to a User with the login of 'x'." },
      ],
    });

    await expect(fetchContributedTo({ username: 'x' }, config)).rejects.toThrow(
      'Could not resolve to a User',
    );
  });
});
