import * as z from 'zod/mini';

import { RANK_ICONS, renderStatsCard } from '../cards/stats.ts';
import type { CardConfig } from '../common/config.ts';
import { fetchStats } from '../fetchers/stats.ts';

import type { ApiResult } from './api-result.ts';
import { errorResult } from './api-result.ts';
import type { ApiQuery } from './params.ts';
import {
  booleanParam,
  enumParam,
  listParam,
  localeParam,
  looseIntParam,
  numberParam,
  parseColorParams,
  parseParams,
  rawParam,
  safeListParam,
  usernameParam,
  yearParam,
} from './params.ts';

/** What the stats endpoint accepts, on top of the shared color params. */
const statsQuery = z.object({
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
  commits_year: yearParam,
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
  rank_icon: enumParam(RANK_ICONS),
  show: listParam,
  contribs_include_own_repos: booleanParam,
});

/** The query this endpoint accepts, checked against the schema above. */
type StatsApiQuery = ApiQuery<typeof statsQuery>;

/**
 * Render the stats card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderStats = async (query: StatsApiQuery, config: CardConfig): Promise<ApiResult> => {
  let colors;
  try {
    colors = parseColorParams(query);
  } catch (error) {
    // A rejected color cannot be used to draw its own error card.
    return errorResult(error);
  }

  try {
    const {
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
      commits_year,
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
    } = parseParams(statsQuery, query);

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
        commits_year,
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

    return {
      status: 'success',
      content: renderStatsCard(
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
          commits_year,
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
      ),
    };
  } catch (error) {
    return errorResult(error, colors);
  }
};

/**
 * The card, with the values its enum params accept.
 * A UI reads them off the function it calls, e.g. `stats.LAYOUTS`.
 */
export const stats = Object.assign(renderStats, {
  RANK_ICONS,
});
