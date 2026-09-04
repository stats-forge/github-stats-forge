import * as z from 'zod/mini';

import {
  TOP_LANG_LAYOUTS,
  TOP_LANG_STATS_FORMATS,
  renderTopLanguages,
} from '../cards/top-languages.ts';
import type { CardConfig } from '../common/config.ts';
import { fetchTopLanguages } from '../fetchers/top-languages.ts';

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
  usernameParam,
} from './params.ts';

/** What the top-languages endpoint accepts, on top of the shared color params. */
const topLangsQuery = z.object({
  username: usernameParam,
  hide: listParam,
  hide_title: booleanParam,
  hide_border: booleanParam,
  card_width: looseIntParam,
  layout: enumParam(TOP_LANG_LAYOUTS),
  langs_count: looseIntParam,
  exclude_repo: listParam,
  size_weight: numberParam,
  count_weight: numberParam,
  custom_title: rawParam,
  locale: localeParam,
  border_radius: numberParam,
  role: listParam,
  disable_animations: booleanParam,
  hide_progress: booleanParam,
  hide_values: booleanParam,
  stats_format: enumParam(TOP_LANG_STATS_FORMATS),
});

/** The query this endpoint accepts, checked against the schema above. */
type TopLangsApiQuery = ApiQuery<typeof topLangsQuery>;

/**
 * Render the top languages card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderTopLangs = async (query: TopLangsApiQuery, config: CardConfig): Promise<ApiResult> => {
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
    } = parseParams(topLangsQuery, query);

    const topLangs = await fetchTopLanguages(
      {
        username,
        exclude_repo,
        size_weight,
        count_weight,
        ownerAffiliations: role,
      },
      config,
    );

    return {
      status: 'success',
      content: renderTopLanguages(topLangs, {
        ...colors,
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
  } catch (error) {
    return errorResult(error, colors);
  }
};

/**
 * The card, with the values its enum params accept.
 * A UI reads them off the function it calls, e.g. `topLangs.LAYOUTS`.
 */
export const topLangs = Object.assign(renderTopLangs, {
  LAYOUTS: TOP_LANG_LAYOUTS,
  STATS_FORMATS: TOP_LANG_STATS_FORMATS,
});
