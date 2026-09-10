import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardError } from '../src/common/error.ts';
import { fetchOrganization } from '../src/fetchers/organization.ts';
import type {
  GetOrganizationQuery,
  OrgRepoInfoFragment,
} from '../src/graphql/generated/organization.ts';

import { testConfig } from './_config.ts';
import { FetchMock } from './_fetch-mock.ts';

/**
 * One page of the repository walk, as GitHub answers it.
 *
 * @returns The response body.
 */
const page = ({
  repos,
  hasNextPage = false,
  endCursor = null,
  totalCount = repos.length,
  name = 'Vitest',
}: {
  repos: Array<OrgRepoInfoFragment>;
  hasNextPage?: boolean;
  endCursor?: string | null;
  totalCount?: number;
  name?: string | null;
}): { data: GetOrganizationQuery } => ({
  data: {
    organization: {
      login: 'vitest-dev',
      name,
      description: 'A blazing fast unit test framework',
      createdAt: '2021-12-08T09:47:15Z',
      membersWithRole: { totalCount: 15 },
      repositories: {
        totalCount,
        pageInfo: { hasNextPage, endCursor },
        nodes: repos,
      },
    },
  },
});

const typescript = { name: 'TypeScript', color: '#3178c6' };
const rust = { name: 'Rust', color: '#dea584' };

/**
 * One repository of a page, with every count the fragment asks for.
 *
 * @returns The repository node.
 */
const repo = ({
  stars = 0,
  forks = 0,
  watchers = 0,
  issues = 0,
  prs = 0,
  releases = 0,
  commits = 0,
  language = typescript,
}: {
  stars?: number;
  forks?: number;
  watchers?: number;
  issues?: number;
  prs?: number;
  releases?: number;
  /** `null` for a repository with no history: an empty one, or a branch pointing at a tag. */
  commits?: number | null;
  language?: { name: string; color: string | null } | null;
} = {}): OrgRepoInfoFragment => ({
  stargazerCount: stars,
  forkCount: forks,
  primaryLanguage: language,
  watchers: { totalCount: watchers },
  issues: { totalCount: issues },
  pullRequests: { totalCount: prs },
  releases: { totalCount: releases },
  defaultBranchRef: commits === null ? null : { target: { history: { totalCount: commits } } },
});

const mock = new FetchMock();
const config = testConfig.with({ fetch: mock.fetch });

afterEach(() => {
  mock.reset();
  vi.restoreAllMocks();
});

describe(fetchOrganization, () => {
  it('sums every count over the repositories it saw', async () => {
    mock.onPost('https://api.github.com/graphql').reply(
      200,
      page({
        repos: [
          {
            stars: 17_069,
            forks: 1966,
            watchers: 80,
            issues: 300,
            prs: 70,
            releases: 800,
            commits: 12_000,
          },
          { stars: 923, forks: 121, watchers: 12, issues: 70, prs: 13, releases: 50, commits: 400 },
          {
            stars: 24,
            forks: 6,
            watchers: 3,
            issues: 6,
            prs: 1,
            releases: 6,
            commits: 10,
            language: rust,
          },
        ].map((fields) => repo(fields)),
        totalCount: 9,
      }),
    );

    await expect(fetchOrganization({ org: 'vitest-dev' }, config)).resolves.toStrictEqual({
      login: 'vitest-dev',
      name: 'Vitest',
      description: 'A blazing fast unit test framework',
      createdAt: '2021-12-08T09:47:15Z',
      publicRepos: 9,
      totalStars: 18_016,
      totalForks: 2093,
      totalWatchers: 95,
      openIssues: 376,
      openPRs: 84,
      totalReleases: 856,
      totalCommits: 12_410,
      publicMembers: 15,
      topLanguage: typescript,
      truncated: false,
    });
  });

  it('counts a repository with no default branch as no commits', async () => {
    mock
      .onPost('https://api.github.com/graphql')
      .reply(200, page({ repos: [repo({ commits: null }), repo({ commits: 12 })] }));

    await expect(fetchOrganization({ org: 'vitest-dev' }, config)).resolves.toMatchObject({
      totalCommits: 12,
    });
  });

  it('follows the cursor while there are more repositories', async () => {
    mock
      .onPost('https://api.github.com/graphql')
      .replyOnce(
        200,
        page({
          repos: [repo({ stars: 100, forks: 10 })],
          hasNextPage: true,
          endCursor: 'cursor-1',
          totalCount: 2,
        }),
      )
      .onPost('https://api.github.com/graphql')
      .replyOnce(
        200,
        page({ repos: [repo({ stars: 5, forks: 1, language: rust })], totalCount: 2 }),
      );

    const data = await fetchOrganization({ org: 'vitest-dev' }, config);

    expect(data.totalStars).toBe(105);
    expect(data.totalForks).toBe(11);
    expect(data.truncated).toBe(false);
    expect(mock.history.post).toHaveLength(2);
    expect(mock.history.post[1]?.data).toContain('cursor-1');
  });

  it('reports totals as truncated when the walk hits its page cap', async () => {
    mock.onPost('https://api.github.com/graphql').reply(
      200,
      page({
        repos: [repo({ stars: 10, forks: 1 })],
        hasNextPage: true,
        endCursor: 'cursor-n',
        totalCount: 900,
      }),
    );

    const data = await fetchOrganization({ org: 'vitest-dev' }, config);

    expect(data.truncated).toBe(true);
    expect(data.totalStars).toBe(50);
    expect(mock.history.post).toHaveLength(5);
  });

  it('has no top language when no repository names one', async () => {
    mock
      .onPost('https://api.github.com/graphql')
      .reply(200, page({ repos: [repo({ stars: 1, language: null })] }));

    await expect(fetchOrganization({ org: 'vitest-dev' }, config)).resolves.toMatchObject({
      topLanguage: null,
    });
  });

  it('falls back to the login when the organization has no display name', async () => {
    mock.onPost('https://api.github.com/graphql').reply(200, page({ repos: [], name: null }));

    await expect(fetchOrganization({ org: 'vitest-dev' }, config)).resolves.toMatchObject({
      name: 'vitest-dev',
    });
  });

  it('keeps the rest of the card when the token may not read the member count', async () => {
    // silences the refusal the fetcher logs
    vi.spyOn(console, 'log').mockReturnValue();

    const { data } = page({ repos: [repo({ stars: 3 })] });

    mock.onPost('https://api.github.com/graphql').reply(200, {
      data: { organization: { ...data.organization, membersWithRole: null } },
      errors: [
        {
          type: 'FORBIDDEN',
          path: ['organization', 'membersWithRole'],
          message: 'Resource not accessible by integration',
        },
      ],
    });

    await expect(fetchOrganization({ org: 'vitest-dev' }, config)).resolves.toMatchObject({
      publicMembers: null,
      totalStars: 3,
    });
  });

  it('rejects a refusal that is not just the member count', async () => {
    vi.spyOn(console, 'error').mockReturnValue();

    mock.onPost('https://api.github.com/graphql').reply(200, {
      data: { organization: null },
      errors: [
        {
          type: 'FORBIDDEN',
          path: ['organization', 'repositories'],
          message: 'Resource not accessible by integration',
        },
      ],
    });

    await expect(fetchOrganization({ org: 'vitest-dev' }, config)).rejects.toMatchObject({
      code: 'upstream',
    });
  });

  it('rejects a login that resolves to a user rather than an organization', async () => {
    mock.onPost('https://api.github.com/graphql').reply(200, {
      data: { organization: null },
      errors: [
        {
          type: 'NOT_FOUND',
          message: "Could not resolve to an Organization with the login of 'marcalexiei'.",
        },
      ],
    });

    await expect(fetchOrganization({ org: 'marcalexiei' }, config)).rejects.toMatchObject({
      code: 'not_found',
      secondaryMessage: 'Make sure the provided organization exists and is not a user',
    });
  });

  it('rejects a malformed login before sending anything', async () => {
    await expect(fetchOrganization({ org: '-nope' }, config)).rejects.toBeInstanceOf(CardError);
    expect(mock.history.post).toHaveLength(0);
  });

  it('rejects a missing login', async () => {
    await expect(fetchOrganization({ org: undefined }, config)).rejects.toMatchObject({
      code: 'missing_param',
      param: 'org',
    });
  });
});
