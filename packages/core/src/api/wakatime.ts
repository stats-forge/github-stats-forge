import { renderWakatimeCard } from "../cards/wakatime.js";
import type { DisplayFormat, WakaTimeLayout } from "../cards/wakatime.js";
import type { ColorParams } from "../common/color.js";
import { findInvalidColorParam, pickColorParams } from "../common/color.js";
import {
  MissingParamError,
  retrieveSecondaryMessage,
} from "../common/error.js";
import { parseArray, parseBoolean } from "../common/ops.js";
import { renderError } from "../common/render.js";
import { fetchWakatimeStats } from "../fetchers/wakatime.js";
import { isLocaleAvailable } from "../translations.js";

import type { ApiResult } from "./api-result.js";

/** Query params the wakatime endpoint accepts, on top of the shared color params. */
interface WakatimeApiQuery extends ColorParams {
  username?: string;
  hide_border?: string;
  card_width?: string;
  line_height?: string;
  hide_title?: string;
  hide_progress?: string;
  custom_title?: string;
  locale?: string;
  layout?: string;
  langs_count?: string;
  hide?: string;
  api_domain?: string;
  border_radius?: string;
  display_format?: string;
  disable_animations?: string;
}

/** Characters a username may contain. */
const SAFE_PATTERN = /^[-\w/.,]+$/;

const LAYOUTS: Array<WakaTimeLayout> = ["compact", "normal"];

const DISPLAY_FORMATS: Array<DisplayFormat> = ["time", "percent"];

/**
 * @param value Raw `layout` param.
 * @returns Whether the card can render this layout.
 */
const isLayout = (value: string): value is WakaTimeLayout =>
  (LAYOUTS as Array<string>).includes(value);

/**
 * @param value Raw `display_format` param.
 * @returns Whether the card can render this display format.
 */
const isDisplayFormat = (value: string): value is DisplayFormat =>
  (DISPLAY_FORMATS as Array<string>).includes(value);

/**
 * Render the WakaTime card for a set of query params.
 *
 * The WakaTime API needs no GitHub token, so this handler takes no config.
 *
 * @param query Raw query params.
 * @param query.username WakaTime username.
 * @param query.hide_border Whether to hide the card border.
 * @param query.card_width Card width.
 * @param query.line_height Line height between the languages.
 * @param query.hide_title Whether to hide the card title.
 * @param query.hide_progress Whether to hide the progress bars.
 * @param query.custom_title Card title.
 * @param query.locale Language the card is rendered in.
 * @param query.layout How the languages are laid out.
 * @param query.langs_count Number of languages to show.
 * @param query.hide Comma-separated languages to hide.
 * @param query.api_domain WakaTime instance the stats are read from.
 * @param query.border_radius Card border radius.
 * @param query.display_format Whether values are shown as time or percentages.
 * @param query.disable_animations Whether to disable the card animations.
 * @returns The rendered card, or a rendered error.
 */
export default async ({
  username,
  hide_border,
  card_width,
  line_height,
  hide_title,
  hide_progress,
  custom_title,
  locale,
  layout,
  langs_count,
  hide,
  api_domain,
  border_radius,
  display_format,
  disable_animations,
  ...remainingParams
}: WakatimeApiQuery): Promise<ApiResult> => {
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

  if (display_format !== undefined && !isDisplayFormat(display_format)) {
    return {
      status: "error - permanent",
      content: renderError({
        message: "Something went wrong",
        secondaryMessage: "Incorrect display_format input",
        renderOptions: colorParams,
      }),
    };
  }

  try {
    const stats = await fetchWakatimeStats({ username, api_domain });

    return {
      status: "success",
      content: renderWakatimeCard(stats, {
        ...colorParams,
        custom_title,
        hide_title: parseBoolean(hide_title),
        hide_border: parseBoolean(hide_border),
        card_width:
          card_width === undefined ? undefined : parseInt(card_width, 10),
        hide: parseArray(hide),
        line_height,
        hide_progress: parseBoolean(hide_progress),
        border_radius: borderRadius,
        locale: locale?.toLowerCase(),
        layout,
        langs_count:
          langs_count === undefined ? undefined : parseInt(langs_count, 10),
        display_format,
        disable_animations: parseBoolean(disable_animations),
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
