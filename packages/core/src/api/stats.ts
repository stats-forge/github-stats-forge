import * as z from 'zod/mini';

import { renderStatsCard } from '../cards/stats.ts';
import { OWNER_AFFILIATIONS } from '../common/constants.ts';
import { fetchStats } from '../fetchers/stats.ts';

import { cardHandler } from './handler.ts';
import {
  booleanParam,
  enumParam,
  fromParam,
  listParam,
  localeParam,
  looseIntParam,
  numberParam,
  ORDERED_RANGE,
  rawParam,
  safeListParam,
  toParam,
  usernameParam,
} from './params.ts';

/** What the stats endpoint accepts, on top of the shared color params. */
const statsQuery = z
  .object({
    username: usernameParam,
    repo: safeListParam,
    owner: safeListParam,
    hide: listParam,
    hide_title: booleanParam,
    hide_border: booleanParam,
    card_width: looseIntParam,
    hide_rank: booleanParam,
    show_icons: booleanParam,
    include_all_commits: booleanParam,
    from: fromParam,
    to: toParam,
    line_height: rawParam,
    text_bold: booleanParam,
    exclude_repo: listParam,
    custom_title: rawParam,
    locale: localeParam,
    disable_animations: booleanParam,
    border_radius: numberParam,
    number_format: rawParam,
    role: listParam,
    number_precision: looseIntParam,
    rank_icon: enumParam(renderStatsCard.OPTIONS.rank_icon),
    show: listParam,
    contribs_include_own_repos: booleanParam,
  })
  .check(ORDERED_RANGE);

/**
 * Render the stats card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderStats = cardHandler(
  statsQuery,
  async (
    {
      username,
      repo,
      owner,
      hide,
      hide_title,
      hide_border,
      card_width,
      hide_rank,
      show_icons,
      include_all_commits,
      from,
      to,
      line_height,
      text_bold,
      exclude_repo,
      custom_title,
      locale,
      disable_animations,
      border_radius,
      number_format,
      role,
      number_precision,
      rank_icon,
      show,
      contribs_include_own_repos,
    },
    colors,
    config,
  ) => {
    // A bare repo name is scoped to the user whose card this is.
    const repository = repo.map((name) =>
      name.includes('/') ? name : `${username ?? ''}/${name}`,
    );

    const stats = await fetchStats(
      {
        username,
        include_all_commits,
        exclude_repo,
        include_merged_pull_requests:
          show.includes('prs_merged') || show.includes('prs_merged_percentage'),
        include_discussions: show.includes('discussions_started'),
        include_discussions_answers: show.includes('discussions_answered'),
        from,
        to,
        repo: repository,
        owner,
        include_prs_authored: show.includes('prs_authored'),
        include_prs_commented: show.includes('prs_commented'),
        include_prs_reviewed: show.includes('prs_reviewed'),
        include_issues_authored: show.includes('issues_authored'),
        include_issues_commented: show.includes('issues_commented'),
        ownerAffiliations: role,
        include_contributions: show.includes('contributions'),
        include_all_time_contribs: show.includes('all_time_contribs'),
        contribs_include_own_repos,
      },
      config,
    );

    return renderStatsCard(
      stats,
      {
        ...colors,
        hide,
        show_icons,
        hide_title,
        hide_border,
        card_width,
        hide_rank,
        include_all_commits,
        line_height,
        text_bold,
        custom_title,
        border_radius,
        number_format,
        number_precision,
        locale,
        disable_animations,
        rank_icon,
        show,
      },
      username,
      repository,
      owner,
    );
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `stats.OPTIONS.rank_icon`.
 */
export const stats = Object.assign(renderStats, {
  OPTIONS: { ...renderStatsCard.OPTIONS, role: OWNER_AFFILIATIONS },
});
