import * as z from "zod/mini";

import { RANK_ICONS, renderStatsCard } from "../cards/stats.js";
import type { CardConfig } from "../common/config.js";
import { fetchStats } from "../fetchers/stats.js";

import type { ApiResult } from "./api-result.js";
import { errorResult } from "./api-result.js";
import type { ApiQuery } from "./params.js";
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
  safeParam,
  yearParam,
} from "./params.js";

/** What the stats endpoint accepts, on top of the shared color params. */
const statsQuery = z.object({
  username: safeParam,
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
 * @param query Raw query params, plus any of the shared color params.
 * @param query.username GitHub username.
 * @param query.repo Comma-separated repositories the search-based stats are scoped to.
 * @param query.owner Comma-separated owners the search-based stats are scoped to.
 * @param query.hide Comma-separated stats to hide.
 * @param query.hide_title Whether to hide the card title.
 * @param query.hide_border Whether to hide the card border.
 * @param query.card_width Card width.
 * @param query.hide_rank Whether to hide the rank circle.
 * @param query.show_icons Whether to show the stat icons.
 * @param query.include_all_commits Whether to count commits of all time.
 * @param query.commits_year Year the commits are counted for.
 * @param query.line_height Line height between the stats.
 * @param query.text_bold Whether the stat values are bold.
 * @param query.exclude_repo Comma-separated repositories to exclude.
 * @param query.custom_title Card title.
 * @param query.locale Language the card is rendered in.
 * @param query.disable_animations Whether to disable the card animations.
 * @param query.border_radius Card border radius.
 * @param query.number_format How numbers are abbreviated.
 * @param query.role Comma-separated owner affiliations to include.
 * @param query.number_precision Decimals kept when a number is abbreviated.
 * @param query.rank_icon Which rank indicator to draw.
 * @param query.show Comma-separated extra stats to show.
 * @param query.contribs_include_own_repos Whether the contributed-to counts include the user's own repositories.
 * @param config Deployment config supplying the PAT pool.
 * @returns The rendered card, or a rendered error.
 */
export default async (
  query: StatsApiQuery,
  config: CardConfig,
): Promise<ApiResult> => {
  let colors;
  try {
    colors = parseColorParams(query);
  } catch (err) {
    // A rejected color cannot be used to draw its own error card.
    return errorResult(err);
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
      name.includes("/") ? name : `${username ?? ""}/${name}`,
    );

    const stats = await fetchStats(
      config,
      username,
      include_all_commits,
      exclude_repo,
      show.includes("prs_merged") || show.includes("prs_merged_percentage"),
      show.includes("discussions_started"),
      show.includes("discussions_answered"),
      commits_year,
      repository,
      owner,
      show.includes("prs_authored"),
      show.includes("prs_commented"),
      show.includes("prs_reviewed"),
      show.includes("issues_authored"),
      show.includes("issues_commented"),
      role,
      show.includes("contributions"),
      show.includes("all_time_contribs"),
      contribs_include_own_repos,
    );

    return {
      status: "success",
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
  } catch (err) {
    return errorResult(err, colors);
  }
};
