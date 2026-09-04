import { calculateRank } from '../calculateRank.js';
import type { CardConfig } from '../common/config.js';
import { GITHUB_USERNAME_PATTERN } from '../common/constants.js';
import type { GitHubDateRange } from '../common/date.js';
import { getGitHubYearRange, toGitHubDateTime } from '../common/date.js';
import { CardError, USER_NOT_FOUND } from '../common/error.js';
import { createGraphQLFetcher, httpRequest } from '../common/http.js';
import type { FetcherContext, GraphQLResponse } from '../common/http.js';
import { logger } from '../common/log.js';
import { buildSearchFilter, chunkArray, parseOwnerAffiliations } from '../common/ops.js';
import { wrapTextMultiline } from '../common/render.js';
import { retryer } from '../common/retryer.js';
import type { FetcherResponse } from '../common/retryer.js';
import { buildContributionsDocument } from '../graphql/contributionsDocument.js';
import { UserInfoDocument, UserReposDocument } from '../graphql/generated/stats.js';
import type {
  RepoNodeFragment,
  UserInfoQuery,
  UserInfoQueryVariables,
} from '../graphql/generated/stats.js';
import {
  MAX_REPOSITORIES_LIMIT,
  buildReposContributedToDocument,
} from '../graphql/reposContributedToDocument.js';

import type { RepoUserStats, StatsData } from './types.js';

/** The subset of the stats response `statsFetcher` returns and threads on. */
type StatsFetcherResponse = Pick<GraphQLResponse<UserInfoQuery>, 'data' | 'statusText'>;

const fetcher = createGraphQLFetcher(UserInfoDocument, 'bearer');
/** Fetcher for the pages after the first, which only need `repositories`. */
const reposFetcher = createGraphQLFetcher(UserReposDocument, 'bearer');

/**
 * Fetch stats information for a given username.
 *
 * @description Supports multi-page fetching when the `FETCH_MULTI_PAGE_STARS`
 * env variable is `true` or a fetch limit.
 *
 * @returns The stats response, with every fetched page's repos merged in.
 */
const statsFetcher = async (
  {
    username,
    includeMergedPullRequests,
    includeDiscussions,
    includeDiscussionsAnswers,
    startTime,
    ownerAffiliations,
    includeUserRepositories,
  }: {
    username: string;
    includeMergedPullRequests: boolean;
    includeDiscussions: boolean;
    includeDiscussionsAnswers: boolean;
    startTime: string | undefined;
    ownerAffiliations: UserInfoQueryVariables['ownerAffiliations'];
    includeUserRepositories: boolean;
  },
  config: CardConfig,
): Promise<StatsFetcherResponse> => {
  // only the first request carries the stats themselves
  let stats: StatsFetcherResponse = await retryer(
    fetcher,
    {
      login: username,
      after: null,
      includeMergedPullRequests,
      includeDiscussions,
      includeDiscussionsAnswers,
      startTime,
      ownerAffiliations,
      includeUserRepositories,
    },
    config,
  );
  if (stats.data.errors) {
    return stats;
  }

  const pageLimit = config.fetchMultiPageStars;

  const extraRepoNodes: Array<RepoNodeFragment | null> = [];
  let pageRepositories = stats.data.data.user?.repositories;
  let previousCursor: string | null = null;
  let fetchedPages = 1;
  while (
    fetchedPages < pageLimit &&
    // an unstarred repo on the page means the starred ones are exhausted
    !pageRepositories?.nodes?.some((node) => node?.stargazerCount === 0) &&
    pageRepositories?.pageInfo.hasNextPage
  ) {
    const after = pageRepositories.pageInfo.endCursor;
    // a null or non-advancing cursor would refetch the same page forever
    if (after === null || after === previousCursor) {
      break;
    }
    previousCursor = after;

    const page = await retryer(reposFetcher, { login: username, after, ownerAffiliations }, config);
    if (page.data.errors) {
      return {
        data: { ...stats.data, errors: page.data.errors },
        statusText: page.statusText,
      };
    }

    pageRepositories = page.data.data.user?.repositories;
    extraRepoNodes.push(...(pageRepositories?.nodes ?? []));
    fetchedPages += 1;
  }

  if (extraRepoNodes.length > 0) {
    // defensive: the merge below is the only place a parsed response is mutated
    stats = structuredClone({
      data: stats.data,
      statusText: stats.statusText,
    });
    stats.data.data.user?.repositories.nodes?.push(...extraRepoNodes);
  }

  return stats;
};

/**
 * Fetch total items count using the REST search API.
 *
 * @see https://developer.github.com/v3/search/#search-commits
 *
 * @returns The search response, carrying `total_count`.
 */
const fetchTotalItems = (
  variables: Record<string, unknown>,
  token: string,
  { fetch }: FetcherContext,
): Promise<FetcherResponse<{ total_count?: number }>> => {
  const type = String(variables['type']);
  const filter = String(variables['filter']);
  const repo = variables['repo'] as Array<string> | string;
  const owner = variables['owner'] as Array<string> | string;
  return httpRequest(
    fetch,
    `https://api.github.com/search/${type}?per_page=1&q=${buildSearchFilter(repo, owner).replaceAll(
      ' ',
      '+',
    )}${filter}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.cloak-preview',
        Authorization: `token ${token}`,
      },
    },
  );
};

/**
 * Fetch a total count for a given username via the REST search API.
 *
 * The GraphQL API can't return this.
 * @see https://github.com/anuraghazra/github-readme-stats/issues/92#issuecomment-661026467
 * @see https://github.com/anuraghazra/github-readme-stats/pull/211
 *
 * @returns Total count.
 */
const totalItemsFetcher = async (
  {
    username,
    repo,
    owner,
    type,
    filter,
  }: {
    username: string;
    repo: Array<string>;
    owner: Array<string>;
    type: string;
    filter: string;
  },
  config: CardConfig,
): Promise<number> => {
  if (!GITHUB_USERNAME_PATTERN.test(username)) {
    logger.log('Invalid username provided.');
    throw new CardError('Invalid username provided.', {
      code: 'invalid_param',
      param: 'username',
    });
  }

  let res: FetcherResponse<{ total_count?: number }>;
  try {
    res = await retryer<{ total_count?: number }>(
      fetchTotalItems,
      { login: username, repo, owner, type, filter },
      config,
    );
  } catch (error) {
    logger.log(error);
    throw error;
  }

  const totalCount = res.data.total_count;
  if (typeof totalCount !== 'number' || Number.isNaN(totalCount)) {
    logger.error(`GitHub error: ${JSON.stringify(res.data)}`);
    throw new CardError('Could not fetch data from GitHub REST API.', {
      code: 'upstream',
    });
  }
  return totalCount;
};

/**
 * Fetch the per-repository counts the REST search API answers, one request each.
 *
 * @returns Only the counts that were asked for.
 */
const fetchRepoUserStats = async (
  {
    username,
    repo = [],
    owner = [],
    include_prs_authored = false,
    include_prs_commented = false,
    include_prs_reviewed = false,
    include_issues_authored = false,
    include_issues_commented = false,
  }: {
    username: string;
    repo?: Array<string>;
    owner?: Array<string>;
    include_prs_authored?: boolean | undefined;
    include_prs_commented?: boolean | undefined;
    include_prs_reviewed?: boolean | undefined;
    include_issues_authored?: boolean | undefined;
    include_issues_commented?: boolean | undefined;
  },
  config: CardConfig,
): Promise<RepoUserStats> => {
  const stats: RepoUserStats = {};
  if (include_prs_authored) {
    stats.totalPRsAuthored = await totalItemsFetcher(
      {
        username,
        repo,
        owner,
        type: 'issues',
        filter: `author:${username}+type:pr`,
      },
      config,
    );
  }
  if (include_prs_commented) {
    stats.totalPRsCommented = await totalItemsFetcher(
      {
        username,
        repo,
        owner,
        type: 'issues',
        filter: `commenter:${username}+-author:${username}+type:pr`,
      },
      config,
    );
  }
  if (include_prs_reviewed) {
    stats.totalPRsReviewed = await totalItemsFetcher(
      {
        username,
        repo,
        owner,
        type: 'issues',
        filter: `reviewed-by:${username}+-author:${username}+type:pr`,
      },
      config,
    );
  }
  if (include_issues_authored) {
    stats.totalIssuesAuthored = await totalItemsFetcher(
      {
        username,
        repo,
        owner,
        type: 'issues',
        filter: `author:${username}+type:issue`,
      },
      config,
    );
  }
  if (include_issues_commented) {
    stats.totalIssuesCommented = await totalItemsFetcher(
      {
        username,
        repo,
        owner,
        type: 'issues',
        filter: `commenter:${username}+-author:${username}+type:issue`,
      },
      config,
    );
  }
  return stats;
};

/**
 * Turn a GraphQL `errors` payload into the error to throw.
 */
const graphqlError = (
  errors: NonNullable<GraphQLResponse<unknown>['data']['errors']>,
  statusText: string,
  fallback: string,
): CardError => {
  logger.error(errors);
  const message = errors[0]?.message;
  return message
    ? new CardError(wrapTextMultiline(message, 525, 12)[0] ?? '', {
        code: 'upstream',
        secondaryMessage: statusText,
      })
    : new CardError(fallback, { code: 'upstream' });
};

/**
 * Fetch all-time contributions by building a single GraphQL query
 * for all the given years.
 *
 * Whether private contributions are included depends on the user's profile settings:
 * https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/manage-visibility-settings-for-private-contributions-and-achievements#changing-the-visibility-of-your-private-contributions
 */
const fetchTotalContributions = async (
  username: string,
  years: Array<number>,
  config: CardConfig,
): Promise<number> => {
  if (years.length === 0) {
    return 0;
  }

  const contributionsFetcher = createGraphQLFetcher(buildContributionsDocument(years), 'bearer');

  const contribRes = await retryer(contributionsFetcher, { login: username }, config);

  if (contribRes.data.errors) {
    throw graphqlError(
      contribRes.data.errors,
      contribRes.statusText,
      'Something went wrong while trying to retrieve the contributions data using the GraphQL API.',
    );
  }

  const { user } = contribRes.data.data;
  if (!user) {
    return 0;
  }

  let total = 0;
  for (const year of years) {
    const yearBlock = user[`year_${year}`];
    if (yearBlock?.contributionCalendar.totalContributions) {
      total += yearBlock.contributionCalendar.totalContributions;
    }
  }
  return total;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Ranges per request.
 * Each costs roughly `4 * MAX_REPOSITORIES_LIMIT` nodes,
 * so an unchunked round of a heavily split account would breach GitHub's 500k node ceiling
 * and lose the ranges that had already resolved along with it.
 */
const MAX_RANGES_PER_REQUEST = 100;

const REPOS_CONTRIBUTED_TO_ERROR =
  'Something went wrong while trying to retrieve the repository contributions data using the GraphQL API.';

/**
 * Count the repositories a user contributed to across every contribution year.
 *
 * `repositoriesContributedTo` spans at most one year,
 * so every year is fetched as an aliased `contributionsCollection(from, to)` in one request and the repos de-duplicated.
 * A range returning `MAX_REPOSITORIES_LIMIT` results may have more,
 * so it is halved and requeried in the next round.
 *
 * Whether private contributions are included depends on the used PAT.
 *
 * @returns Count of repositories.
 */
const fetchAllTimeReposContributedTo = async (
  /** `nameWithOwner` uses GitHub's casing, which the query-string username need not match */
  canonicalUsername: string,
  years: Array<number>,
  includeOwnRepos: boolean,
  config: CardConfig,
): Promise<number> => {
  const repos = new Set<string>();
  let pending = years.map((year) => getGitHubYearRange(year));

  while (pending.length > 0) {
    const nextPending: Array<GitHubDateRange> = [];

    for (const chunk of chunkArray(pending, MAX_RANGES_PER_REQUEST)) {
      const chunkFetcher = createGraphQLFetcher(
        buildReposContributedToDocument(chunk, includeOwnRepos),
        'bearer',
      );
      const res = await retryer(
        chunkFetcher,
        { login: canonicalUsername, maxRepositories: MAX_REPOSITORIES_LIMIT },
        config,
      );
      if (res.data.errors) {
        throw graphqlError(res.data.errors, res.statusText, REPOS_CONTRIBUTED_TO_ERROR);
      }
      const { user } = res.data.data;
      if (!user) {
        throw new CardError(REPOS_CONTRIBUTED_TO_ERROR, { code: 'upstream' });
      }

      for (const [index, range] of chunk.entries()) {
        const rangeResponse = user[`range_${index}`];
        if (!rangeResponse) {
          throw new CardError(REPOS_CONTRIBUTED_TO_ERROR, {
            code: 'upstream',
          });
        }

        const lists = [
          rangeResponse.commitContributionsByRepository,
          rangeResponse.issueContributionsByRepository,
          rangeResponse.pullRequestContributionsByRepository,
          (rangeResponse.repositoryContributions?.nodes ?? []).filter((node) => node !== null),
        ];
        const isSaturated = lists.some((list) => list.length >= MAX_REPOSITORIES_LIMIT);

        const rangeDays = Math.round((range.to.getTime() - range.from.getTime()) / MS_PER_DAY);
        // a range of 1 day or less can't be split any further
        if (isSaturated && rangeDays >= 2) {
          // every `from` sits on UTC midnight, so the split lands on a day boundary too
          const mid = new Date(range.from.getTime() + Math.floor(rangeDays / 2) * MS_PER_DAY);
          // GitHub only reads the date portion,
          // so the first half ends 1 second before `mid` to keep the halves from sharing a day
          nextPending.push(
            { from: range.from, to: new Date(mid.getTime() - 1000) },
            { from: mid, to: range.to },
          );
          continue;
        }
        if (isSaturated) {
          logger.log(
            `Range ${range.from.toISOString()} - ${range.to.toISOString()} is saturated but cannot be split further.`,
          );
        }

        for (const { repository } of lists.flat()) {
          const name = repository.nameWithOwner;
          if (includeOwnRepos || !name.startsWith(`${canonicalUsername}/`)) {
            repos.add(name);
          }
        }
      }
    }

    // each saturated range pushes both of its halves
    const saturatedCount = nextPending.length / 2;
    if (saturatedCount > 0) {
      logger.log(`found ${saturatedCount} saturated ranges, splitting and retrying...`);
    }
    pending = nextPending;
  }

  return repos.size;
};

/**
 * Fetch stats for a given username.
 *
 * @returns Stats data.
 */
const fetchStats = async (
  {
    username,
    include_all_commits = false,
    exclude_repo = [],
    include_merged_pull_requests = false,
    include_discussions = false,
    include_discussions_answers = false,
    commits_year,
    repo = [],
    owner = [],
    include_prs_authored = false,
    include_prs_commented = false,
    include_prs_reviewed = false,
    include_issues_authored = false,
    include_issues_commented = false,
    ownerAffiliations = [],
    include_contributions = false,
    include_all_time_contribs = false,
    contribs_include_own_repos = false,
  }: {
    username: string | undefined;
    include_all_commits?: boolean | undefined;
    exclude_repo?: Array<string>;
    include_merged_pull_requests?: boolean;
    include_discussions?: boolean;
    include_discussions_answers?: boolean;
    commits_year?: number | undefined;
    repo?: Array<string>;
    owner?: Array<string>;
    include_prs_authored?: boolean;
    include_prs_commented?: boolean;
    include_prs_reviewed?: boolean;
    include_issues_authored?: boolean;
    include_issues_commented?: boolean;
    ownerAffiliations?: Array<string>;
    include_contributions?: boolean;
    include_all_time_contribs?: boolean;
    contribs_include_own_repos?: boolean | undefined;
  },
  config: CardConfig,
): Promise<StatsData> => {
  if (!username) {
    throw CardError.missingParam(['username']);
  }

  const stats: StatsData = {
    name: '',
    totalPRs: 0,
    totalPRsMerged: 0,
    mergedPRsPercentage: 0,
    totalReviews: 0,
    totalCommits: 0,
    totalIssues: 0,
    totalStars: 0,
    totalDiscussionsStarted: 0,
    totalDiscussionsAnswered: 0,
    contributedTo: 0,
    allTimeContributedTo: 0,
    totalPRsAuthored: 0,
    totalPRsCommented: 0,
    totalPRsReviewed: 0,
    totalIssuesAuthored: 0,
    totalIssuesCommented: 0,
    totalContributions: 0,
    rank: { level: 'C', percentile: 100 },
  };
  const affiliations = parseOwnerAffiliations(ownerAffiliations);

  const res = await statsFetcher(
    {
      username,
      includeMergedPullRequests: include_merged_pull_requests,
      includeDiscussions: include_discussions,
      includeDiscussionsAnswers: include_discussions_answers,
      startTime:
        commits_year === undefined
          ? undefined
          : toGitHubDateTime(getGitHubYearRange(commits_year).from),
      ownerAffiliations: affiliations,
      includeUserRepositories: contribs_include_own_repos,
    },
    config,
  );

  // Catch GraphQL errors.
  if (res.data.errors) {
    logger.error(res.data.errors);
    const [firstError] = res.data.errors;
    if (firstError?.type === 'NOT_FOUND') {
      throw new CardError(firstError.message || 'Could not fetch user.', {
        code: 'not_found',
        secondaryMessage: USER_NOT_FOUND,
      });
    }
    if (firstError?.message) {
      throw new CardError(wrapTextMultiline(firstError.message, 525, 12)[0] ?? '', {
        code: 'upstream',
        secondaryMessage: res.statusText,
      });
    }
    throw new CardError(
      'Something went wrong while trying to retrieve the stats data using the GraphQL API.',
      { code: 'upstream' },
    );
  }

  const { user } = res.data.data;
  if (!user) {
    throw new CardError('Could not fetch user.', {
      code: 'not_found',
      secondaryMessage: USER_NOT_FOUND,
    });
  }

  stats.name = user.name || user.login;

  // if include_all_commits, fetch all commits using the REST API.
  if (include_all_commits) {
    stats.totalCommits = await totalItemsFetcher(
      {
        username,
        repo,
        owner,
        type: 'commits',
        filter: `author:${username}`,
      },
      config,
    );
  } else {
    stats.totalCommits = user.commits.totalCommitContributions;
  }
  const repoUserStats = await fetchRepoUserStats(
    {
      username,
      repo,
      owner,
      include_prs_authored,
      include_prs_commented,
      include_prs_reviewed,
      include_issues_authored,
      include_issues_commented,
    },
    config,
  );
  Object.assign(stats, repoUserStats);

  stats.totalPRs = user.pullRequests.totalCount;
  if (include_merged_pull_requests) {
    const mergedCount = user.mergedPullRequests?.totalCount ?? 0;
    stats.totalPRsMerged = mergedCount;
    stats.mergedPRsPercentage = (mergedCount / user.pullRequests.totalCount) * 100 || 0;
  }
  stats.totalReviews = user.reviews.totalPullRequestReviewContributions;
  stats.totalIssues = user.openIssues.totalCount + user.closedIssues.totalCount;
  if (include_discussions) {
    stats.totalDiscussionsStarted = user.repositoryDiscussions?.totalCount ?? 0;
  }
  if (include_discussions_answers) {
    stats.totalDiscussionsAnswered = user.repositoryDiscussionComments?.totalCount ?? 0;
  }
  stats.contributedTo = user.repositoriesContributedTo.totalCount;

  if (include_contributions) {
    stats.totalContributions = await fetchTotalContributions(
      username,
      user.contributionsCollection.contributionYears,
      config,
    );
  }

  if (include_all_time_contribs) {
    stats.allTimeContributedTo = await fetchAllTimeReposContributedTo(
      user.login,
      user.contributionsCollection.contributionYears,
      contribs_include_own_repos,
      config,
    );
  }

  // Retrieve stars while filtering out repositories to be hidden.
  const allExcludedRepos = [...exclude_repo, ...config.excludeRepositories];
  const repoToHide = new Set(allExcludedRepos);

  stats.totalStars = (user.repositories.nodes ?? [])
    .filter((data) => !!data && !repoToHide.has(data.name))
    .reduce((prev, curr) => prev + (curr?.stargazerCount ?? 0), 0);

  stats.rank = calculateRank({
    all_commits: include_all_commits,
    commits: stats.totalCommits,
    prs: stats.totalPRs,
    reviews: stats.totalReviews,
    issues: stats.totalIssues,
    repos: user.repositories.totalCount,
    stars: stats.totalStars,
    followers: user.followers.totalCount,
  });

  return stats;
};

export { fetchStats, fetchRepoUserStats };
