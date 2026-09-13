import type { CardConfig } from '../common/config.ts';
import { GITHUB_USERNAME_PATTERN } from '../common/constants.ts';
import type { GitHubDateRange } from '../common/date.ts';
import { toSearchDate } from '../common/date.ts';
import { CardError, ISSUES_FORBIDDEN, ORGANIZATION_NOT_FOUND } from '../common/error.ts';
import { createGraphQLFetcher, httpRequest } from '../common/http.ts';
import type { FetcherContext, HttpResponse } from '../common/http.ts';
import { logger } from '../common/log.ts';
import { clampValue } from '../common/ops.ts';
import { retryer } from '../common/retryer.ts';
import { GetOrganizationActivityDocument } from '../graphql/generated/org-activity.ts';
import type { GetOrganizationActivityQuery } from '../graphql/generated/org-activity.ts';

import { graphqlError } from './graphql-error.ts';
import type { OrgActivityData } from './types.ts';

const fetcher = createGraphQLFetcher(GetOrganizationActivityDocument, 'token');

const urlExample = '/api/org-activity?org=ORG_NAME';

const ORGANIZATION_ACTIVITY_ERROR =
  'Something went wrong while trying to retrieve the organization activity using the GraphQL API.';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days the window covers when the query names none, and the widest it may be asked for. */
const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

/**
 * The window the counts cover: the last `days` days, ending today.
 * Both ends are dates rather than instants, because that is all a search qualifier reads —
 * so `days` of `1` is today alone.
 *
 * @returns The range, in UTC.
 */
const lastDays = (days: number): GitHubDateRange => {
  const now = new Date();
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { from: new Date(to.getTime() - (days - 1) * MS_PER_DAY), to };
};

/**
 * Whether the issue searches were answered with something other than issues.
 *
 * This is the one refusal GitHub does not report: a token that may not read issues — an app
 * installation token without the `Issues` permission — is answered with the pull requests the
 * same window holds, so both counts arrive looking exactly like the pull request rows rather
 * than erroring. Asking each search for one node is what tells the two apart, and costs nothing:
 * the request is still a single rate-limit point.
 *
 * @returns Whether either count is a pull request count wearing an issue's label.
 */
const issuesRefused = (...searches: Array<GetOrganizationActivityQuery['issuesOpened']>): boolean =>
  searches.some((search) => search.issueCount > 0 && search.nodes?.[0]?.__typename !== 'Issue');

/**
 * Commits authored in the window, which the GraphQL API cannot search for.
 *
 * @returns The REST search response, carrying `total_count`.
 */
const fetchCommitCount = (
  { org, range }: { org: string; range: GitHubDateRange },
  token: string,
  { fetch }: FetcherContext,
): Promise<HttpResponse<{ total_count?: number }>> => {
  const query = `org:${org}+author-date:${toSearchDate(range.from)}..${toSearchDate(range.to)}`;
  return httpRequest(fetch, `https://api.github.com/search/commits?per_page=1&q=${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.cloak-preview',
      Authorization: `token ${token}`,
    },
  });
};

/**
 * What an organization did over a window: pull requests, issues and discussions,
 * and the commits behind them when they are asked for.
 *
 * Every count but the commits rides on one GraphQL request — an aliased `search` per figure,
 * which costs a single rate-limit point however many of them the card ends up drawing.
 * The commits are a REST search of their own, so they are only fetched when asked for.
 *
 * A count covers the organization's public repositories, plus whatever private ones the
 * token can see: a search answers what its token is allowed to find.
 *
 * @returns The counts, and the window they cover.
 */
const fetchOrgActivity = async (
  {
    org,
    days,
    include_commits = false,
    require_issues = true,
  }: {
    org: string | undefined;
    /** Days the window covers; out of range or unparsed, the default stands. */
    days?: number | undefined;
    include_commits?: boolean | undefined;
    /**
     * Whether refused issue counts fail the whole fetch rather than dropping the two stats.
     * The card draws both rows unless `hide` names them, so a caller that wants neither
     * turns this off and gets the rest of the card from a token that may not read issues.
     */
    require_issues?: boolean | undefined;
  },
  config: CardConfig,
): Promise<OrgActivityData> => {
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

  const window =
    days !== undefined && Number.isFinite(days) ? clampValue(days, 1, MAX_DAYS) : DEFAULT_DAYS;
  const range = lastDays(window);
  const within = `${toSearchDate(range.from)}..${toSearchDate(range.to)}`;
  const scope = `org:${org}`;

  const res = await retryer(
    fetcher,
    {
      login: org,
      prsOpened: `${scope} is:pr created:${within}`,
      prsMerged: `${scope} is:pr merged:${within}`,
      issuesOpened: `${scope} is:issue created:${within}`,
      issuesClosed: `${scope} is:issue closed:${within}`,
      discussions: `${scope} created:${within}`,
    },
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
    throw graphqlError(res.data.errors, res.statusText, ORGANIZATION_ACTIVITY_ERROR);
  }

  const { data } = res.data;
  if (!data.organization) {
    throw new CardError('Organization not found', {
      code: 'not_found',
      secondaryMessage: ORGANIZATION_NOT_FOUND,
    });
  }

  const issuesUnavailable = issuesRefused(data.issuesOpened, data.issuesClosed);
  if (issuesUnavailable) {
    if (require_issues) {
      throw CardError.forbidden(ISSUES_FORBIDDEN);
    }
    logger.error(
      `Issue counts dropped: this token may not read issues, so GitHub answered the issue searches for ${org} with pull requests. Grant the token read access to issues to draw those two rows.`,
    );
  }

  let commits: number | null = null;
  if (include_commits) {
    const commitRes = await retryer(fetchCommitCount, { org, range }, config);
    const total = commitRes.data.total_count;
    if (typeof total === 'number') {
      commits = total;
    } else {
      // the rest of the card is already fetched, so a refused commit search drops the row
      logger.error(`GitHub error: ${JSON.stringify(commitRes.data)}`);
    }
  }

  return {
    login: data.organization.login,
    name: data.organization.name || data.organization.login,
    range,
    days: window,
    prsOpened: data.prsOpened.issueCount,
    prsMerged: data.prsMerged.issueCount,
    issuesOpened: issuesUnavailable ? null : data.issuesOpened.issueCount,
    issuesClosed: issuesUnavailable ? null : data.issuesClosed.issueCount,
    discussionsOpened: data.discussions.discussionCount,
    commits,
  };
};

export { fetchOrgActivity };
