import type { CardConfig } from '../common/config.ts';
import type { GitHubDateRange } from '../common/date.ts';
import { toContributionRanges, toRange } from '../common/date.ts';
import { CardError, USER_NOT_FOUND } from '../common/error.ts';
import { createGraphQLFetcher } from '../common/http.ts';
import { logger } from '../common/log.ts';
import { chunkArray, clampValue } from '../common/ops.ts';
import { retryer } from '../common/retryer.ts';
import { UserContributionYearsDocument } from '../graphql/generated/contributed-to.ts';
import {
  MAX_REPOSITORIES_LIMIT,
  buildReposContributedToDocument,
} from '../graphql/reposContributedToDocument.ts';

import { graphqlError } from './graphql-error.ts';
import type { ContributedToData, ContributedRepo } from './types.ts';

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

/** Rows the card ranks when the query names no count, and the most it will rank. */
const DEFAULT_REPOS_COUNT = 5;
const MAX_REPOS_COUNT = 20;

const CONTRIBUTION_YEARS_ERROR =
  'Something went wrong while trying to retrieve the contribution years using the GraphQL API.';

/** What one repository accumulated over the walk. */
interface RepoContributions {
  /**
   * Commit-days plus issues and pull requests opened.
   * `CreatedCommitContribution` is one node per repository per day,
   * so its `totalCount` counts days with commits, not commits —
   * true commit counts would mean fetching the connection's nodes.
   */
  contributions: number;
  /** Every year the user contributed to it. */
  years: Set<number>;
}

const yearsFetcher = createGraphQLFetcher(UserContributionYearsDocument, 'bearer');

/**
 * The repositories a user contributed to across every contribution year, with what each one got.
 *
 * `repositoriesContributedTo` spans at most one year,
 * so every range is fetched as an aliased `contributionsCollection(from, to)` in one request and the repos merged.
 * A range returning `MAX_REPOSITORIES_LIMIT` results may have more,
 * so it is halved and requeried in the next round — a split stays inside its own calendar year,
 * which is what makes `range.from`'s year the contribution's year.
 *
 * Whether private contributions are included depends on the used PAT.
 *
 * @returns Every repository found, keyed by `nameWithOwner`.
 */
const fetchReposContributedTo = async (
  /** `nameWithOwner` uses GitHub's casing, which the query-string username need not match */
  canonicalUsername: string,
  /** One per calendar year, so a contribution's year is the one its range starts in. */
  ranges: Array<GitHubDateRange>,
  includeOwnRepos: boolean,
  config: CardConfig,
): Promise<Map<string, RepoContributions>> => {
  const repos = new Map<string, RepoContributions>();
  let pending = ranges;

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

        const counted = [
          rangeResponse.commitContributionsByRepository,
          rangeResponse.issueContributionsByRepository,
          rangeResponse.pullRequestContributionsByRepository,
        ];
        // creating a repository is one contribution, and the field carries no count of its own
        const created = (rangeResponse.repositoryContributions?.nodes ?? [])
          .filter((node) => node !== null)
          .map((node) => ({ repository: node.repository, contributions: { totalCount: 1 } }));
        const lists = [...counted, created];
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

        const year = range.from.getUTCFullYear();
        for (const { repository, contributions } of lists.flat()) {
          const name = repository.nameWithOwner;
          if (!includeOwnRepos && name.startsWith(`${canonicalUsername}/`)) {
            continue;
          }
          const existing = repos.get(name);
          if (existing) {
            existing.contributions += contributions.totalCount;
            existing.years.add(year);
          } else {
            repos.set(name, {
              contributions: contributions.totalCount,
              years: new Set([year]),
            });
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

  return repos;
};

/**
 * Whether a repository was excluded by the query or by the deployment.
 *
 * An entry matches either the full `owner/name` or the bare `name`,
 * so a host's `EXCLUDE_REPO` — which the other cards match against bare names — still bites here,
 * where a repository is identified by its owner as well.
 *
 * @returns The test, over lowercased entries.
 */
const excludes = (entries: Array<string>): ((nameWithOwner: string) => boolean) => {
  const excluded = new Set(entries.map((entry) => entry.toLowerCase()));
  return (nameWithOwner) => {
    const lowered = nameWithOwner.toLowerCase();
    return excluded.has(lowered) || excluded.has(lowered.slice(lowered.indexOf('/') + 1));
  };
};

/**
 * Rank the repositories a user has contributed to, most contributions first.
 *
 * `from` and `to` narrow the walk to the range they name,
 * so the ranking, the totals and the year marks all cover that range and nothing else.
 * A range the account contributed in no year of draws an empty card rather than an error.
 *
 * Ties keep the walk's order, which is chronological:
 * the repository first seen in the earliest range comes first.
 *
 * An excluded repository is dropped before the total is counted,
 * so the footer's "top n of m" never counts one the card was told not to show.
 *
 * @returns The ranked slice, and the totals it was taken from.
 */
const fetchContributedTo = async (
  {
    username,
    include_own_repos = false,
    repos_count,
    exclude_repo = [],
    from,
    to,
  }: {
    username: string | undefined;
    include_own_repos?: boolean | undefined;
    /** Rows to rank; out of range or unparsed, the default stands. */
    repos_count?: number | undefined;
    /** Each entry is an `owner/name` or a bare `name`. */
    exclude_repo?: Array<string>;
    /** Start of the range to walk; as early as GitHub goes when absent. */
    from?: Date | undefined;
    /** End of that range. */
    to?: Date | undefined;
  },
  config: CardConfig,
): Promise<ContributedToData> => {
  if (!username) {
    throw CardError.missingParam(['username']);
  }

  const count =
    repos_count !== undefined && Number.isFinite(repos_count)
      ? clampValue(repos_count, 1, MAX_REPOS_COUNT)
      : DEFAULT_REPOS_COUNT;

  const res = await retryer(yearsFetcher, { login: username }, config);
  if (res.data.errors) {
    const [firstError] = res.data.errors;
    if (firstError?.type === 'NOT_FOUND') {
      throw new CardError(firstError.message || 'Could not fetch user.', {
        code: 'not_found',
        secondaryMessage: USER_NOT_FOUND,
      });
    }
    throw graphqlError(res.data.errors, res.statusText, CONTRIBUTION_YEARS_ERROR);
  }

  const { user } = res.data.data;
  if (!user) {
    throw new CardError('Could not fetch user.', {
      code: 'not_found',
      secondaryMessage: USER_NOT_FOUND,
    });
  }

  const ranges = toContributionRanges(
    user.contributionsCollection.contributionYears,
    toRange(from, to),
  );
  const years = ranges.map((range) => range.from.getUTCFullYear());

  const found = await fetchReposContributedTo(user.login, ranges, include_own_repos, config);

  const isExcluded = excludes([...exclude_repo, ...config.excludeRepositories]);
  const kept = [...found].filter(([nameWithOwner]) => !isExcluded(nameWithOwner));

  const ranked: Array<ContributedRepo> = kept
    .map(([nameWithOwner, { contributions, years: repoYears }]) => ({
      nameWithOwner,
      contributions,
      years: [...repoYears].toSorted((a, b) => a - b),
    }))
    .toSorted((a, b) => b.contributions - a.contributions);

  return {
    login: user.login,
    repos: ranked.slice(0, count),
    totalRepos: kept.length,
    years,
  };
};

export { fetchContributedTo, fetchReposContributedTo };
