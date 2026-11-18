import type { CardConfig } from '../../common/config.ts';
import { GITHUB_USERNAME_PATTERN } from '../../common/constants.ts';
import { CardError, fromGraphQL } from '../../common/error.ts';
import { createGraphQLFetcher } from '../../common/http.ts';
import type { GraphQLResponse } from '../../common/http.ts';
import { retryer } from '../../common/retryer.ts';
import { GetOrganizationDocument } from '../../graphql/generated/organization.ts';
import type {
  GetOrganizationQuery,
  OrgRepoInfoFragment,
} from '../../graphql/generated/organization.ts';

import type { OrganizationData } from './types.ts';

const fetcher = createGraphQLFetcher(GetOrganizationDocument);

const urlExample = '/api/org?org=ORG_NAME';

/**
 * How many repositories a page asks for, and how many the walk reads at most.
 * GitHub gives up on a request after about ten seconds, and releases and commits cost it roughly
 * a third of a second per large repository, so a walk counting them reads fewer, in smaller pages.
 * The repositories arrive most-starred first, so a cap costs the tail of the list
 * rather than the headline figures.
 */
const WALK = {
  light: { pageSize: 50, maxRepos: 500 },
  heavy: { pageSize: 10, maxRepos: 50 },
} as const;

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
 * The member count is the one field here a token can be refused:
 * it needs the organization `Members` permission, which an app installation token rarely carries.
 * The query asks for it under a root of its own, `members`, so the refusal nulls that root alone
 * and the card drops the stat instead of failing whole.
 *
 * @returns Whether the member count is all the response was refused.
 */
const onlyMembersForbidden = (
  errors: NonNullable<GraphQLResponse<unknown>['data']['errors']>,
): boolean =>
  errors.every((error) => error.type === 'FORBIDDEN' && error.path?.at(-1) === 'membersWithRole');

/**
 * Fetch an organization and the totals of its public repositories.
 *
 * Only public, non-fork repositories are counted, most-starred first: at most 500,
 * or 50 when releases or commits are counted — `truncated` says when the walk stopped early.
 *
 * @returns The organization data.
 */
const fetchOrganization = async (
  {
    org,
    require_members = false,
    include_releases = false,
    include_commits = false,
  }: {
    org: string | undefined;
    /**
     * Whether a refused member count fails the whole fetch rather than dropping the stat.
     * The card draws the row only under `show=members`, so only that query has anything
     * to be told; without it a refusal is the operator's business and not the caller's.
     */
    require_members?: boolean | undefined;
    /** Whether to count releases, which costs GitHub enough to shrink the walk. */
    include_releases?: boolean | undefined;
    /** Whether to count default-branch commits, which costs GitHub enough to shrink the walk. */
    include_commits?: boolean | undefined;
  },
  config: CardConfig,
): Promise<OrganizationData> => {
  if (!org) {
    throw CardError.because('missing_param', { params: ['org'], hint: urlExample });
  }
  // `./fetchers` is a public export, so the login is checked here as well as at the api boundary.
  if (!GITHUB_USERNAME_PATTERN.test(org)) {
    throw CardError.because('org_invalid');
  }

  const repos: Array<OrgRepoInfoFragment> = [];
  let organization: Organization | undefined;
  let publicMembers: number | null;
  let after: string | null = null;
  let membersForbidden = false;
  const { pageSize, maxRepos } = include_releases || include_commits ? WALK.heavy : WALK.light;

  do {
    // Annotated because the walk feeds its own cursor back in, which TypeScript reads as circular.
    const res: GraphQLResponse<GetOrganizationQuery> = await retryer(
      fetcher,
      {
        login: org,
        after,
        first: pageSize,
        withReleases: include_releases,
        withCommits: include_commits,
      },
      config,
    );
    if (res.data.errors) {
      // A login that is a user, or nothing at all, answers NOT_FOUND — which `fromGraphQL`
      // words for a user query, so this endpoint's own wording is thrown instead.
      if (res.data.errors[0]?.type === 'NOT_FOUND') {
        throw CardError.because('org_not_found');
      }
      if (!onlyMembersForbidden(res.data.errors)) {
        throw fromGraphQL(res.data.errors, res.statusText, 'organization data', config.logger);
      }
      if (require_members) {
        throw CardError.because('org_members_forbidden');
      }
      // the walk can page five times, and one refusal is worth saying once
      if (!membersForbidden) {
        config.logger.error(
          `Member count dropped: this token may not read the members of ${org}. Grant it the organization \`Members\` permission to draw that row. GitHub said: ${res.data.errors[0]?.message ?? 'Forbidden'}`,
        );
      }
      membersForbidden = true;
    }

    organization = res.data.data.organization ?? undefined;
    if (!organization) {
      throw CardError.because('org_not_found');
    }
    publicMembers = res.data.data.members?.membersWithRole.totalCount ?? null;

    repos.push(...(organization.repositories.nodes ?? []).filter((node) => node !== null));
    const { hasNextPage, endCursor } = organization.repositories.pageInfo;
    after = hasNextPage ? endCursor : null;
  } while (after !== null && repos.length < maxRepos);

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
    totalReleases: include_releases ? sum((repo) => repo.releases?.totalCount ?? 0) : null,
    // An empty repository has no default branch, and a branch pointing at a tag has no history.
    totalCommits: include_commits
      ? sum((repo) => {
          const target = repo.defaultBranchRef?.target;
          return target !== null && target !== undefined && 'history' in target
            ? target.history.totalCount
            : 0;
        })
      : null,
    publicMembers,
    topLanguage: topLanguage(repos),
    truncated: after !== null,
  };
};

export { fetchOrganization };
