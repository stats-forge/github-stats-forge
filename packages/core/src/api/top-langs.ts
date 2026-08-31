import { renderTopLanguages } from "../cards/top-languages.js";
import type {
  TopLangLayout,
  TopLangStatsFormat,
} from "../cards/top-languages.js";
import type { ColorParams } from "../common/color.js";
import { findInvalidColorParam, pickColorParams } from "../common/color.js";
import type { CardConfig } from "../common/config.js";
import {
  MissingParamError,
  retrieveSecondaryMessage,
} from "../common/error.js";
import { parseArray, parseBoolean } from "../common/ops.js";
import { renderError } from "../common/render.js";
import { fetchTopLanguages } from "../fetchers/top-languages.js";
import { isLocaleAvailable } from "../translations.js";

import type { ApiResult } from "./api-result.js";

/** Query params the top-languages endpoint accepts, on top of the shared color params. */
interface TopLangsApiQuery extends ColorParams {
  username?: string;
  hide?: string;
  hide_title?: string;
  hide_border?: string;
  card_width?: string;
  layout?: string;
  langs_count?: string;
  exclude_repo?: string;
  size_weight?: string;
  count_weight?: string;
  custom_title?: string;
  locale?: string;
  border_radius?: string;
  role?: string;
  disable_animations?: string;
  hide_progress?: string;
  hide_values?: string;
  stats_format?: string;
}

/** Characters a username may contain. */
const SAFE_PATTERN = /^[-\w/.,]+$/;

const LAYOUTS: Array<TopLangLayout> = [
  "compact",
  "normal",
  "donut",
  "donut-vertical",
  "pie",
];

const STATS_FORMATS: Array<TopLangStatsFormat> = ["bytes", "percentages"];

/**
 * @param value Raw `layout` param.
 * @returns Whether the card can render this layout.
 */
const isLayout = (value: string): value is TopLangLayout =>
  (LAYOUTS as Array<string>).includes(value);

/**
 * @param value Raw `stats_format` param.
 * @returns Whether the card can render this stats format.
 */
const isStatsFormat = (value: string): value is TopLangStatsFormat =>
  (STATS_FORMATS as Array<string>).includes(value);

/**
 * Render the top languages card for a set of query params.
 *
 * @param query Raw query params.
 * @param query.username GitHub username.
 * @param query.hide Comma-separated languages to hide.
 * @param query.hide_title Whether to hide the card title.
 * @param query.hide_border Whether to hide the card border.
 * @param query.card_width Card width.
 * @param query.layout How the languages are laid out.
 * @param query.langs_count Number of languages to show.
 * @param query.exclude_repo Comma-separated repositories to exclude.
 * @param query.size_weight Weight given to a language's size.
 * @param query.count_weight Weight given to a language's repository count.
 * @param query.custom_title Card title.
 * @param query.locale Language the card is rendered in.
 * @param query.border_radius Card border radius.
 * @param query.role Comma-separated owner affiliations to include.
 * @param query.disable_animations Whether to disable the card animations.
 * @param query.hide_progress Whether to hide the progress bars.
 * @param query.hide_values Whether to hide the language values.
 * @param query.stats_format Whether values are shown as bytes or percentages.
 * @param config Deployment config supplying the PAT pool.
 * @returns The rendered card, or a rendered error.
 */
export default async (
  {
    username,
    hide,
    hide_title,
    hide_border,
    card_width,
    layout,
    langs_count,
    exclude_repo,
    size_weight,
    count_weight,
    custom_title,
    locale,
    border_radius,
    role,
    disable_animations,
    hide_progress,
    hide_values,
    stats_format,
    ...remainingParams
  }: TopLangsApiQuery,
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
        secondaryMessage: "Locale not found",
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

  if (username && !SAFE_PATTERN.test(username)) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage: "Username contains unsafe characters",
        renderOptions: colorParams,
      }),
    };
  }

  if (layout !== undefined && !isLayout(layout)) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage: "Incorrect layout input",
        renderOptions: colorParams,
      }),
    };
  }

  if (stats_format !== undefined && !isStatsFormat(stats_format)) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage: "Incorrect stats_format input",
        renderOptions: colorParams,
      }),
    };
  }

  try {
    const topLangs = await fetchTopLanguages(
      config,
      username,
      parseArray(exclude_repo),
      size_weight === undefined ? undefined : Number(size_weight),
      count_weight === undefined ? undefined : Number(count_weight),
      parseArray(role),
    );

    return {
      status: "success",
      content: renderTopLanguages(topLangs, {
        ...colorParams,
        custom_title,
        hide_title: parseBoolean(hide_title),
        hide_border: parseBoolean(hide_border),
        card_width:
          card_width === undefined ? undefined : parseInt(card_width, 10),
        hide: parseArray(hide),
        layout,
        langs_count:
          langs_count === undefined ? undefined : parseInt(langs_count, 10),
        border_radius: borderRadius,
        locale: locale?.toLowerCase(),
        disable_animations: parseBoolean(disable_animations),
        hide_progress: parseBoolean(hide_progress),
        hide_values: parseBoolean(hide_values),
        stats_format,
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
