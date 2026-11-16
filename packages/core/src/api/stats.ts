import {
  booleanParam,
  commonParams,
  enumListParam,
  enumParam,
  intParam,
  safeListParam,
  statRowParams,
  titleParams,
} from '@stats-forge/card-kit';
import * as z from 'zod/mini';

import { renderStatsCard } from '../cards/stats/index.ts';
import { OWNER_AFFILIATIONS } from '../common/constants.ts';
import { fetchStats, REPO_USER_SEARCHES } from '../fetchers/stats/index.ts';

import { cardHandler } from './handler.ts';
import {
  fromParam,
  ORDERED_RANGE,
  scopeNeedsSearch,
  scopeParam,
  toParam,
  usernameParam,
} from './params.ts';

/** Every stat the card draws: `show` and `hide` each accept any of them. */
const STATS = [...renderStatsCard.OPTIONS.hide, ...renderStatsCard.OPTIONS.show] as const;

/**
 * A stat shown and hidden is not drawn, and a stat not drawn is not fetched.
 *
 * @returns The stats `show` adds that `hide` leaves in.
 */
const drawnStats = <TStat extends string>({
  show,
  hide,
}: {
  show: ReadonlyArray<TStat>;
  hide: ReadonlyArray<string>;
}): Set<TStat> => new Set(show.filter((stat) => !hide.includes(stat)));

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
    layout: enumParam(renderStatsCard.OPTIONS.layout),
    show: enumListParam(STATS, renderStatsCard.OPTIONS.show),
    include_own_repos: booleanParam,
  })
  .check(ORDERED_RANGE)
  .check(
    scopeNeedsSearch((query) => {
      const drawn = drawnStats(query);
      return (
        REPO_USER_SEARCHES.some((stat) => drawn.has(stat)) ||
        (query.include_all_commits === true && !query.hide.includes('commits'))
      );
    }),
  );

/**
 * Render the stats card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderStats = cardHandler(
  statsQuery,
  { username: 'username' },
  async (params, theme, config) => {
    const {
      username,
      include_all_commits,
      exclude_repo,
      from,
      to,
      scope,
      affiliation,
      include_own_repos,
    } = params;
    const drawn = drawnStats(params);

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
        searches: REPO_USER_SEARCHES.filter((search) => drawn.has(search)),
        ownerAffiliations: affiliation,
        include_contributions: drawn.has('contributions'),
        include_all_time_contribs: drawn.has('contributed_to_all_time'),
        include_own_repos,
      },
      config,
    );

    return renderStatsCard(stats, { ...params, ...theme });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `stats.OPTIONS.rank_icon`.
 */
export const stats = Object.assign(renderStats, {
  OPTIONS: { ...renderStatsCard.OPTIONS, affiliation: OWNER_AFFILIATIONS },
});
