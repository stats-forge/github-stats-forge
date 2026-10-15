import * as z from 'zod/mini';

import { renderTopLanguages } from '../cards/top-languages/index.ts';
import { OWNER_AFFILIATIONS } from '../common/constants.ts';
import { fetchTopLanguages } from '../fetchers/top-languages.ts';

import { cardHandler } from './handler.ts';
import {
  booleanParam,
  commonParams,
  enumListParam,
  enumParam,
  intParam,
  listParam,
  numberParam,
  safeListParam,
  titleParams,
  usernameParam,
} from './params.ts';

/** What the top-languages endpoint accepts, on top of the shared color params. */
const topLangsQuery = z.object({
  username: usernameParam,
  ...commonParams,
  ...titleParams,
  hide_langs: listParam,
  card_width: intParam({ px: true }),
  layout: enumParam(renderTopLanguages.OPTIONS.layout),
  langs_count: intParam(),
  exclude_repo: safeListParam,
  size_weight: numberParam(),
  count_weight: numberParam(),
  role: enumListParam(OWNER_AFFILIATIONS),
  hide_progress: booleanParam,
  hide_values: booleanParam,
  value_format: enumParam(renderTopLanguages.OPTIONS.value_format),
});

/**
 * Render the top languages card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderTopLangs = cardHandler(
  topLangsQuery,
  { username: 'username' },
  async (
    {
      username,
      hide_langs,
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
      value_format,
    },
    colors,
    config,
  ) => {
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

    return renderTopLanguages(topLangs, {
      ...colors,
      custom_title,
      hide_title,
      hide_border,
      card_width,
      hide_langs,
      layout,
      langs_count,
      border_radius,
      locale,
      disable_animations,
      hide_progress,
      hide_values,
      value_format,
    });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `topLangs.OPTIONS.layout`.
 */
export const topLangs = Object.assign(renderTopLangs, {
  OPTIONS: { ...renderTopLanguages.OPTIONS, role: OWNER_AFFILIATIONS },
});
