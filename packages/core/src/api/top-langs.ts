import * as z from "zod/mini";

import {
  TOP_LANG_LAYOUTS,
  TOP_LANG_STATS_FORMATS,
  renderTopLanguages,
} from "../cards/top-languages.js";
import type { CardConfig } from "../common/config.js";
import { fetchTopLanguages } from "../fetchers/top-languages.js";

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
  safeParam,
} from "./params.js";

/** What the top-languages endpoint accepts, on top of the shared color params. */
const topLangsQuery = z.object({
  username: safeParam("Username contains unsafe characters"),
  hide: listParam,
  hide_title: booleanParam,
  hide_border: booleanParam,
  card_width: looseIntParam,
  layout: enumParam(TOP_LANG_LAYOUTS, "Incorrect layout input"),
  langs_count: looseIntParam,
  exclude_repo: listParam,
  size_weight: numberParam("size_weight"),
  count_weight: numberParam("count_weight"),
  custom_title: rawParam,
  locale: localeParam,
  border_radius: numberParam("border_radius"),
  role: listParam,
  disable_animations: booleanParam,
  hide_progress: booleanParam,
  hide_values: booleanParam,
  stats_format: enumParam(
    TOP_LANG_STATS_FORMATS,
    "Incorrect stats_format input",
  ),
});

/** The query this endpoint accepts, checked against the schema above. */
type TopLangsApiQuery = ApiQuery<typeof topLangsQuery>;

/**
 * Render the top languages card for a set of query params.
 *
 * @param query Raw query params.
 * @param config Deployment config supplying the PAT pool.
 * @returns The rendered card, or a rendered error.
 */
export default async (
  query: TopLangsApiQuery,
  config: CardConfig,
): Promise<ApiResult> => {
  const colors = parseColorParams(query);
  if (!colors.ok) {
    return permanentError(colors.secondaryMessage);
  }

  const parsed = parseParams(topLangsQuery, query);
  if (!parsed.ok) {
    return permanentError(parsed.secondaryMessage, colors.params);
  }
  const {
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
  } = parsed.params;

  try {
    const topLangs = await fetchTopLanguages(
      config,
      username,
      exclude_repo,
      size_weight,
      count_weight,
      role,
    );

    return {
      status: "success",
      content: renderTopLanguages(topLangs, {
        ...colors.params,
        custom_title,
        hide_title,
        hide_border,
        card_width,
        hide,
        layout,
        langs_count,
        border_radius,
        locale,
        disable_animations,
        hide_progress,
        hide_values,
        stats_format,
      }),
    };
  } catch (err) {
    return temporaryError(err, colors.params);
  }
};
