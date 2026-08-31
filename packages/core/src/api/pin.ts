import { renderRepoCard } from "../cards/repo.js";
import type { ColorParams } from "../common/color.js";
import { findInvalidColorParam, pickColorParams } from "../common/color.js";
import type { CardConfig } from "../common/config.js";
import {
  MissingParamError,
  retrieveSecondaryMessage,
} from "../common/error.js";
import { parseArray, parseBoolean } from "../common/ops.js";
import { renderError } from "../common/render.js";
import { fetchRepo } from "../fetchers/repo.js";
import { isLocaleAvailable } from "../translations.js";

import type { ApiResult } from "./api-result.js";

/** Query params the pin endpoint accepts, on top of the shared color params. */
interface PinApiQuery extends ColorParams {
  username?: string;
  repo?: string;
  hide_border?: string;
  card_width?: string;
  show_owner?: string;
  browser_rendering?: string;
  show?: string;
  show_icons?: string;
  number_format?: string;
  text_bold?: string;
  line_height?: string;
  locale?: string;
  border_radius?: string;
  description_lines_count?: string;
}

/** Characters a username or repository name may contain. */
const SAFE_PATTERN = /^[-\w/.,]+$/;

/**
 * Render the repository card for a set of query params.
 *
 * @param query Raw query params.
 * @param query.username GitHub username the repository belongs to.
 * @param query.repo Repository name.
 * @param query.hide_border Whether to hide the card border.
 * @param query.card_width Card width.
 * @param query.show_owner Whether to show the repository owner.
 * @param query.browser_rendering Whether the browser wraps the description text.
 * @param query.show Comma-separated extra stats to show.
 * @param query.show_icons Whether to show the stat icons.
 * @param query.number_format How numbers are abbreviated.
 * @param query.text_bold Whether the stat values are bold.
 * @param query.line_height Line height between the stats.
 * @param query.locale Language the card is rendered in.
 * @param query.border_radius Card border radius.
 * @param query.description_lines_count Lines the description is wrapped to.
 * @param config Deployment config supplying the PAT pool.
 * @returns The rendered card, or a rendered error.
 */
export default async (
  {
    username,
    repo,
    hide_border,
    card_width,
    show_owner,
    browser_rendering,
    show,
    show_icons,
    number_format,
    text_bold,
    line_height,
    locale,
    border_radius,
    description_lines_count,
    ...remainingParams
  }: PinApiQuery,
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

  if (
    (username && !SAFE_PATTERN.test(username)) ||
    (repo && !SAFE_PATTERN.test(repo))
  ) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage: "Username or repository contains unsafe characters",
        renderOptions: colorParams,
      }),
    };
  }

  try {
    const showStats = parseArray(show);
    const repoData = await fetchRepo(
      config,
      username,
      repo,
      showStats.includes("prs_authored"),
      showStats.includes("prs_commented"),
      showStats.includes("prs_reviewed"),
      showStats.includes("issues_authored"),
      showStats.includes("issues_commented"),
    );

    return {
      status: "success",
      content: renderRepoCard(repoData, {
        ...colorParams,
        hide_border: parseBoolean(hide_border),
        border_radius: borderRadius,
        card_width_input:
          card_width === undefined ? undefined : parseInt(card_width, 10),
        show_owner: parseBoolean(show_owner),
        browser_rendering: parseBoolean(browser_rendering),
        show: showStats,
        show_icons: parseBoolean(show_icons),
        number_format,
        text_bold: parseBoolean(text_bold),
        line_height,
        username,
        locale: locale?.toLowerCase(),
        description_lines_count:
          description_lines_count === undefined
            ? undefined
            : parseInt(description_lines_count, 10),
      }),
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
