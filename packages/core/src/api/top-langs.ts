import * as z from 'zod/mini';

import { renderTopLanguages } from '../cards/top-languages.ts';
import type { CardConfig } from '../common/config.ts';
import { OWNER_AFFILIATIONS } from '../common/constants.ts';
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
  layout: enumParam(renderTopLanguages.OPTIONS.layout),
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
  stats_format: enumParam(renderTopLanguages.OPTIONS.stats_format),
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
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `topLangs.OPTIONS.layout`.
 */
export const topLangs = Object.assign(renderTopLangs, {
  OPTIONS: { ...renderTopLanguages.OPTIONS, role: OWNER_AFFILIATIONS },
});
