import { renderStatsCard } from "../cards/stats.js";
import type { RankIcon } from "../cards/stats.js";
import type { ColorParams } from "../common/color.js";
import { findInvalidColorParam, pickColorParams } from "../common/color.js";
import type { CardConfig } from "../common/config.js";
import {
  MissingParamError,
  retrieveSecondaryMessage,
} from "../common/error.js";
import { parseArray, parseBoolean } from "../common/ops.js";
import { renderError } from "../common/render.js";
import { fetchStats } from "../fetchers/stats.js";
import { isLocaleAvailable } from "../translations.js";

import type { ApiResult } from "./api-result.js";

/** Query params the stats endpoint accepts, on top of the shared color params. */
interface StatsApiQuery extends ColorParams {
  username?: string;
  repo?: string;
  owner?: string;
  hide?: string;
  hide_title?: string;
  hide_border?: string;
  card_width?: string;
  hide_rank?: string;
  show_icons?: string;
  include_all_commits?: string;
  commits_year?: string;
  line_height?: string;
  text_bold?: string;
  exclude_repo?: string;
  custom_title?: string;
  locale?: string;
  disable_animations?: string;
  border_radius?: string;
  number_format?: string;
  role?: string;
  number_precision?: string;
  rank_icon?: string;
  show?: string;
  contribs_include_own_repos?: string;
}

/** Characters a username, repository or owner may contain. */
const SAFE_PATTERN = /^[-\w/.,]+$/;

const RANK_ICONS: Array<RankIcon> = ["default", "github", "percentile"];

/**
 * @param value Raw `rank_icon` param.
 * @returns Whether the card can render this rank icon.
 */
const isRankIcon = (value: string): value is RankIcon =>
  (RANK_ICONS as Array<string>).includes(value);

/**
 * Render the stats card for a set of query params.
 *
 * @param query Raw query params.
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
    ...remainingParams
  }: StatsApiQuery,
  config: CardConfig,
): Promise<ApiResult> => {
  const colorParams = pickColorParams(remainingParams);

  const invalidColorInput = findInvalidColorParam(colorParams);
  if (invalidColorInput) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage: `Invalid color input for parameter "${invalidColorInput}"`,
      }),
    };
  }

  if (locale && !isLocaleAvailable(locale)) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage: "Language not found",
        renderOptions: colorParams,
      }),
    };
  }

  if (
    (username && !SAFE_PATTERN.test(username)) ||
    (repo && !SAFE_PATTERN.test(repo)) ||
    (owner && !SAFE_PATTERN.test(owner))
  ) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage:
          "Username, repository or owner contains unsafe characters",
        renderOptions: colorParams,
      }),
    };
  }

  // anything but a four-digit year builds a DateTime GitHub rejects
  if (commits_year !== undefined && !/^\d{4}$/.test(commits_year)) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage: 'Invalid number input for parameter "commits_year"',
        renderOptions: colorParams,
      }),
    };
  }
  const commitsYear =
    commits_year === undefined ? undefined : Number(commits_year);

  const borderRadius =
    border_radius === undefined ? undefined : parseFloat(border_radius);
  if (borderRadius !== undefined && !Number.isFinite(borderRadius)) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage: 'Invalid number input for parameter "border_radius"',
        renderOptions: colorParams,
      }),
    };
  }

  if (rank_icon !== undefined && !isRankIcon(rank_icon)) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage: "Incorrect rank_icon input",
        renderOptions: colorParams,
      }),
    };
  }

  try {
    const showStats = parseArray(show);
    const repoOwner = parseArray(owner);
    const repository = parseArray(repo).map((name) =>
      name.includes("/") ? name : `${username ?? ""}/${name}`,
    );

    const stats = await fetchStats(
      config,
      username,
      parseBoolean(include_all_commits),
      parseArray(exclude_repo),
      showStats.includes("prs_merged") ||
        showStats.includes("prs_merged_percentage"),
      showStats.includes("discussions_started"),
      showStats.includes("discussions_answered"),
      commitsYear,
      repository,
      repoOwner,
      showStats.includes("prs_authored"),
      showStats.includes("prs_commented"),
      showStats.includes("prs_reviewed"),
      showStats.includes("issues_authored"),
      showStats.includes("issues_commented"),
      parseArray(role),
      showStats.includes("contributions"),
      showStats.includes("all_time_contribs"),
      parseBoolean(contribs_include_own_repos),
    );

    return {
      status: "success",
      content: renderStatsCard(
        stats,
        {
          ...colorParams,
          hide: parseArray(hide),
          show_icons: parseBoolean(show_icons),
          hide_title: parseBoolean(hide_title),
          hide_border: parseBoolean(hide_border),
          card_width:
            card_width === undefined ? undefined : parseInt(card_width, 10),
          hide_rank: parseBoolean(hide_rank),
          include_all_commits: parseBoolean(include_all_commits),
          commits_year: commitsYear,
          line_height,
          text_bold: parseBoolean(text_bold),
          custom_title,
          border_radius: borderRadius,
          number_format,
          number_precision:
            number_precision === undefined
              ? undefined
              : parseInt(number_precision, 10),
          locale: locale?.toLowerCase(),
          disable_animations: parseBoolean(disable_animations),
          rank_icon,
          show: showStats,
        },
        username,
        repository,
        repoOwner,
      ),
    };
  } catch (err) {
    if (err instanceof Error) {
      return {
        status: "error - temporary",
        content: renderError({
          message: err.message,
          secondaryMessage: retrieveSecondaryMessage(err),
          renderOptions: {
            ...colorParams,
            show_repo_link: !(err instanceof MissingParamError),
          },
        }),
      };
    }
    return {
      status: "error - temporary",
      content: renderError({
        message: "An unknown error occurred",
        renderOptions: colorParams,
      }),
    };
  }
};
