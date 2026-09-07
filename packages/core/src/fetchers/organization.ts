import type { CardConfig } from '../common/config.ts';
import { GITHUB_USERNAME_PATTERN } from '../common/constants.ts';
import { CardError, ORGANIZATION_NOT_FOUND } from '../common/error.ts';
import { createGraphQLFetcher } from '../common/http.ts';
import type { GraphQLResponse } from '../common/http.ts';
import { retryer } from '../common/retryer.ts';
import { GetOrganizationDocument } from '../graphql/generated/organization.ts';
import type {
  GetOrganizationQuery,
  OrgRepoInfoFragment,
} from '../graphql/generated/organization.ts';

import { graphqlError } from './graphql-error.ts';
import type { OrganizationData } from './types.ts';

const fetcher = createGraphQLFetcher(GetOrganizationDocument, 'token');

const urlExample = '/api/org?org=ORG_NAME';

const ORGANIZATION_ERROR =
  'Something went wrong while trying to retrieve the organization data using the GraphQL API.';

/**
 * Pages of repositories the walk asks for, 100 each.
 * Named in the doc comments below as the number it is, so the constant stays internal.
 * The totals are sums over what it saw and the repositories arrive most-starred first,
 * so the cap costs an organization past it the tail of its list rather than its headline figures.
 */
const MAX_REPO_PAGES = 5;

/** The organization as the query returns it, once it has resolved. */
type Organization = NonNullable<GetOrganizationQuery['organization']>;

/**
 * @returns The language most of those repositories name as their primary one, `null` when none do.
 */
const topLanguage = (
  repos: Array<OrgRepoInfoFragment>,
): { name: string; color: string | null } | null => {
  const counts = new Map<string, { color: string | null; count: number }>();

  for (const { primaryLanguage } of repos) {
    if (primaryLanguage) {
      const seen = counts.get(primaryLanguage.name);
      counts.set(primaryLanguage.name, {
        color: primaryLanguage.color,
        count: (seen?.count ?? 0) + 1,
      });
    }
  }

  let top: { name: string; color: string | null } | null = null;
  let max = 0;
  for (const [name, { color, count }] of counts) {
    if (count > max) {
      max = count;
      top = { name, color };
    }
  }

  return top;
};

/**
 * Fetch an organization and the totals of its public repositories.
 *
 * Only public, non-fork repositories are counted, most-starred first,
 * and at most five pages of 100 — `truncated` says when the walk stopped early.
 *
 * @returns The organization data.
 */
const fetchOrganization = async (
  { org }: { org: string | undefined },
  config: CardConfig,
): Promise<OrganizationData> => {
  if (!org) {
    throw CardError.missingParam(['org'], urlExample);
  }
  // `./fetchers` is a public export, so the login is checked here as well as at the api boundary.
  if (!GITHUB_USERNAME_PATTERN.test(org)) {
    throw new CardError('Invalid organization provided.', {
      code: 'invalid_param',
      param: 'org',
    });
  }

  const repos: Array<OrgRepoInfoFragment> = [];
  let organization: Organization | undefined;
  let after: string | null = null;
  let pages = 0;

  do {
    // Annotated because the walk feeds its own cursor back in, which TypeScript reads as circular.
    const res: GraphQLResponse<GetOrganizationQuery> = await retryer(
      fetcher,
      { login: org, after },
      config,
    );
    if (res.data.errors) {
      // A login that is a user, or nothing at all, answers NOT_FOUND — which `graphqlError`
      // words for a user query, so this endpoint's own wording is thrown instead.
      if (res.data.errors[0]?.type === 'NOT_FOUND') {
        throw new CardError('Organization not found', {
          code: 'not_found',
          secondaryMessage: ORGANIZATION_NOT_FOUND,
        });
      }
      throw graphqlError(res.data.errors, res.statusText, ORGANIZATION_ERROR);
    }

    organization = res.data.data.organization ?? undefined;
    if (!organization) {
      throw new CardError('Organization not found', {
        code: 'not_found',
        secondaryMessage: ORGANIZATION_NOT_FOUND,
      });
    }

    repos.push(...(organization.repositories.nodes ?? []).filter((node) => node !== null));
    const { hasNextPage, endCursor } = organization.repositories.pageInfo;
    after = hasNextPage ? endCursor : null;
    pages += 1;
  } while (after !== null && pages < MAX_REPO_PAGES);

  const sum = (count: (repo: OrgRepoInfoFragment) => number): number =>
    repos.reduce((total, repo) => total + count(repo), 0);

  return {
    login: organization.login,
    name: organization.name || organization.login,
    description: organization.description,
    createdAt: organization.createdAt,
    publicRepos: organization.repositories.totalCount,
    totalStars: sum((repo) => repo.stargazerCount),
    totalForks: sum((repo) => repo.forkCount),
    totalWatchers: sum((repo) => repo.watchers.totalCount),
    openIssues: sum((repo) => repo.issues.totalCount),
    openPRs: sum((repo) => repo.pullRequests.totalCount),
    totalReleases: sum((repo) => repo.releases.totalCount),
    // An empty repository has no default branch, and a branch pointing at a tag has no history.
    totalCommits: sum((repo) => {
      const target = repo.defaultBranchRef?.target;
      return target !== null && target !== undefined && 'history' in target
        ? target.history.totalCount
        : 0;
    }),
    publicMembers: organization.membersWithRole.totalCount,
    topLanguage: topLanguage(repos),
    truncated: after !== null,
  };
};

export { fetchOrganization };
