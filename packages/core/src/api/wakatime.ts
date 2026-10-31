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
  hide_progress: booleanParam,
  layout: enumParam(renderWakatimeCard.OPTIONS.layout),
  langs_count: intParam(),
  hide_langs: listParam,
  wakatime_host: hostnameParam,
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
  async (params, colors, config) => {
    const { username, wakatime_host } = params;
    const stats = await fetchWakatimeStats({ username, wakatime_host }, config);
    return renderWakatimeCard(stats, { ...params, ...colors });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `wakatime.OPTIONS.layout`.
 */
export const wakatime = Object.assign(renderWakatime, { OPTIONS: renderWakatimeCard.OPTIONS });
