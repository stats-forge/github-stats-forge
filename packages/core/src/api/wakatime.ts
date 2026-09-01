import * as z from "zod/mini";

import {
  DISPLAY_FORMATS,
  WAKATIME_LAYOUTS,
  renderWakatimeCard,
} from "../cards/wakatime.js";
import type { CardConfig } from "../common/config.js";
import { fetchWakatimeStats } from "../fetchers/wakatime.js";

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
  safeParam,
} from "./params.js";

/** What the wakatime endpoint accepts, on top of the shared color params. */
const wakatimeQuery = z.object({
  username: safeParam,
  hide_border: booleanParam,
  card_width: looseIntParam,
  line_height: rawParam,
  hide_title: booleanParam,
  hide_progress: booleanParam,
  custom_title: rawParam,
  locale: localeParam,
  layout: enumParam(WAKATIME_LAYOUTS),
  langs_count: looseIntParam,
  hide: listParam,
  api_domain: rawParam,
  border_radius: numberParam,
  display_format: enumParam(DISPLAY_FORMATS),
  disable_animations: booleanParam,
});

/** The query this endpoint accepts, checked against the schema above. */
type WakatimeApiQuery = ApiQuery<typeof wakatimeQuery>;

/**
 * Render the WakaTime card for a set of query params.
 *
 * WakaTime needs no GitHub token, so the config is read only for the transport it carries.
 *
 * @param query Raw query params, plus any of the shared color params.
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
 * @param config Deployment config supplying the transport.
 * @returns The rendered card, or a rendered error.
 */
const renderWakatime = async (
  query: WakatimeApiQuery,
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
    } = parseParams(wakatimeQuery, query);

    const stats = await fetchWakatimeStats({ username, api_domain }, config);

    return {
      status: "success",
      content: renderWakatimeCard(stats, {
        ...colors,
        custom_title,
        hide_title,
        hide_border,
        card_width,
        hide,
        line_height,
        hide_progress,
        border_radius,
        locale,
        layout,
        langs_count,
        display_format,
        disable_animations,
      }),
    };
  } catch (err) {
    return errorResult(err, colors);
  }
};

/**
 * The card, with the values its enum params accept.
 * A UI reads them off the function it calls, e.g. `wakatime.LAYOUTS`.
 */
export const wakatime = Object.assign(renderWakatime, {
  LAYOUTS: WAKATIME_LAYOUTS,
  DISPLAY_FORMATS,
});
