import * as z from "zod/mini";

import { RANK_ICONS, renderStatsCard } from "../cards/stats.js";
import type { CardConfig } from "../common/config.js";
import { fetchStats } from "../fetchers/stats.js";

import type { ApiResult } from "./api-result.js";
import { permanentError, temporaryError } from "./api-result.js";
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

const UNSAFE_NAME = "Username, repository or owner contains unsafe characters";

/** What the stats endpoint accepts, on top of the shared color params. */
const statsQuery = z.object({
  username: safeParam(UNSAFE_NAME),
  repo: safeListParam(UNSAFE_NAME),
  owner: safeListParam(UNSAFE_NAME),
  hide: listParam,
  hide_title: booleanParam,
  hide_border: booleanParam,
  card_width: looseIntParam,
  hide_rank: booleanParam,
  show_icons: booleanParam,
  include_all_commits: booleanParam,
  commits_year: yearParam("commits_year"),
  line_height: rawParam,
  text_bold: booleanParam,
  exclude_repo: listParam,
  custom_title: rawParam,
  locale: localeParam,
  disable_animations: booleanParam,
  border_radius: numberParam("border_radius"),
  number_format: rawParam,
  role: listParam,
  number_precision: looseIntParam,
  rank_icon: enumParam(RANK_ICONS, "Incorrect rank_icon input"),
  show: listParam,
  contribs_include_own_repos: booleanParam,
});

/** The query this endpoint accepts, checked against the schema above. */
type StatsApiQuery = ApiQuery<typeof statsQuery>;

/**
 * Render the stats card for a set of query params.
 *
 * @param query Raw query params.
 * @param config Deployment config supplying the PAT pool.
 * @returns The rendered card, or a rendered error.
 */
export default async (
  query: StatsApiQuery,
  config: CardConfig,
): Promise<ApiResult> => {
  const colors = parseColorParams(query);
  if (!colors.ok) {
    return permanentError(colors.secondaryMessage);
  }

  const parsed = parseParams(statsQuery, query);
  if (!parsed.ok) {
    return permanentError(parsed.secondaryMessage, colors.params);
  }
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
  } = parsed.params;

  try {
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
          ...colors.params,
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
    return temporaryError(err, colors.params);
  }
};
