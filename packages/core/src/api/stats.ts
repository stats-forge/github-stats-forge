import * as z from 'zod/mini';

import { renderStatsCard } from '../cards/stats/index.ts';
import { OWNER_AFFILIATIONS } from '../common/constants.ts';
import { fetchStats } from '../fetchers/stats.ts';

import { cardHandler } from './handler.ts';
import {
  booleanParam,
  commonParams,
  enumListParam,
  enumParam,
  fromParam,
  intParam,
  ORDERED_RANGE,
  safeListParam,
  scopeNeedsSearch,
  scopeParam,
  statRowParams,
  titleParams,
  toParam,
  usernameParam,
} from './params.ts';

/** Every stat the card draws: `show` and `hide` each accept any of them. */
const STATS = [...renderStatsCard.OPTIONS.hide, ...renderStatsCard.OPTIONS.show] as const;

/** The stats counted by search, which `scope` narrows, with commits when `include_all_commits` is on. */
const SEARCH_STATS = [
  'prs_opened',
  'prs_commented',
  'prs_reviewed',
  'issues_opened',
  'issues_commented',
] as const;

/** What the stats endpoint accepts, on top of the shared color params. */
const statsQuery = z
  .object({
    username: usernameParam,
    ...commonParams,
    ...titleParams,
    ...statRowParams,
    scope: scopeParam,
    hide: enumListParam(STATS, renderStatsCard.OPTIONS.hide),
    card_width: intParam({ px: true }),
    hide_rank: booleanParam,
    include_all_commits: booleanParam,
    from: fromParam,
    to: toParam,
    exclude_repo: safeListParam,
    affiliation: enumListParam(OWNER_AFFILIATIONS),
    rank_icon: enumParam(renderStatsCard.OPTIONS.rank_icon),
    show: enumListParam(STATS, renderStatsCard.OPTIONS.show),
    include_own_repos: booleanParam,
  })
  .check(ORDERED_RANGE)
  .check(
    scopeNeedsSearch(
      ({ show, hide, include_all_commits }) =>
        SEARCH_STATS.some((stat) => show.includes(stat) && !hide.includes(stat)) ||
        (include_all_commits === true && !hide.includes('commits')),
    ),
  );

/**
 * Render the stats card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderStats = cardHandler(
  statsQuery,
  { username: 'username' },
  async (params, colors, config) => {
    const {
      username,
      include_all_commits,
      exclude_repo,
      from,
      to,
      scope,
      affiliation,
      show,
      hide,
      include_own_repos,
    } = params;
    // a stat shown and hidden is not drawn, and a stat not drawn is not fetched
    const drawn = new Set(show.filter((stat) => !hide.includes(stat)));

    const stats = await fetchStats(
      {
        username,
        include_all_commits,
        exclude_repo,
        include_merged_pull_requests: drawn.has('prs_merged') || drawn.has('prs_merged_percentage'),
        include_discussions: drawn.has('discussions_started'),
        include_discussions_answers: drawn.has('discussions_answered'),
        from,
        to,
        scope,
        include_prs_authored: drawn.has('prs_opened'),
        include_prs_commented: drawn.has('prs_commented'),
        include_prs_reviewed: drawn.has('prs_reviewed'),
        include_issues_authored: drawn.has('issues_opened'),
        include_issues_commented: drawn.has('issues_commented'),
        ownerAffiliations: affiliation,
        include_contributions: drawn.has('contributions'),
        include_all_time_contribs: drawn.has('contributed_to_all_time'),
        include_own_repos,
      },
      config,
    );

    return renderStatsCard(stats, { ...params, ...colors });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `stats.OPTIONS.rank_icon`.
 */
export const stats = Object.assign(renderStats, {
  OPTIONS: { ...renderStatsCard.OPTIONS, affiliation: OWNER_AFFILIATIONS },
});
