import * as z from 'zod/mini';

import { renderWakatimeCard } from '../cards/wakatime/index.ts';
import { fetchWakatimeStats } from '../fetchers/wakatime.ts';

import { cardHandler } from './handler.ts';
import {
  booleanParam,
  commonParams,
  enumParam,
  hostnameParam,
  intParam,
  listParam,
  titleParams,
  wakatimeUsernameParam,
} from './params.ts';

/** What the wakatime endpoint accepts, on top of the shared color params. */
const wakatimeQuery = z.object({
  username: wakatimeUsernameParam,
  ...commonParams,
  ...titleParams,
  card_width: intParam({ px: true }),
  line_height: intParam(),
  hide_progress: booleanParam,
  layout: enumParam(renderWakatimeCard.OPTIONS.layout),
  langs_count: intParam(),
  hide_langs: listParam,
  api_domain: hostnameParam,
  value_format: enumParam(renderWakatimeCard.OPTIONS.value_format),
});

/**
 * Render the WakaTime card for a set of query params.
 *
 * WakaTime needs no GitHub token, so the config is read only for the transport it carries.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderWakatime = cardHandler(
  wakatimeQuery,
  // no allowlist: `username` is a WakaTime profile, not a GitHub login (see `apps/server/README.md`)
  {},
  async (
    {
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
      hide_langs,
      api_domain,
      border_radius,
      value_format,
      disable_animations,
    },
    colors,
    config,
  ) => {
    const stats = await fetchWakatimeStats({ username, api_domain }, config);

    return renderWakatimeCard(stats, {
      ...colors,
      custom_title,
      hide_title,
      hide_border,
      card_width,
      hide_langs,
      line_height,
      hide_progress,
      border_radius,
      locale,
      layout,
      langs_count,
      value_format,
      disable_animations,
    });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `wakatime.OPTIONS.layout`.
 */
export const wakatime = Object.assign(renderWakatime, { OPTIONS: renderWakatimeCard.OPTIONS });
