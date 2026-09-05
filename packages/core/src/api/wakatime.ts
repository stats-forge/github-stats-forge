import * as z from 'zod/mini';

import { renderWakatimeCard } from '../cards/wakatime.ts';
import { fetchWakatimeStats } from '../fetchers/wakatime.ts';

import { cardHandler } from './handler.ts';
import {
  booleanParam,
  enumParam,
  listParam,
  localeParam,
  looseIntParam,
  numberParam,
  rawParam,
  safeParam,
} from './params.ts';

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
  layout: enumParam(renderWakatimeCard.OPTIONS.layout),
  langs_count: looseIntParam,
  hide: listParam,
  api_domain: rawParam,
  border_radius: numberParam,
  display_format: enumParam(renderWakatimeCard.OPTIONS.display_format),
  disable_animations: booleanParam,
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
      hide,
      api_domain,
      border_radius,
      display_format,
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
      hide,
      line_height,
      hide_progress,
      border_radius,
      locale,
      layout,
      langs_count,
      display_format,
      disable_animations,
    });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `wakatime.OPTIONS.layout`.
 */
export const wakatime = Object.assign(renderWakatime, { OPTIONS: renderWakatimeCard.OPTIONS });
