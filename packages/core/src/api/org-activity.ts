import * as z from 'zod/mini';

import { renderOrgActivityCard } from '../cards/org-activity/index.ts';
import { fetchOrgActivity } from '../fetchers/org-activity.ts';

import { cardHandler } from './handler.ts';
import {
  booleanParam,
  listParam,
  localeParam,
  looseIntParam,
  numberParam,
  rawParam,
  usernameParam,
} from './params.ts';

/** What the organization activity endpoint accepts, on top of the shared color params. */
const orgActivityQuery = z.object({
  org: usernameParam,
  days: looseIntParam,
  hide: listParam,
  show: listParam,
  show_icons: booleanParam,
  hide_title: booleanParam,
  hide_border: booleanParam,
  card_width: looseIntParam,
  line_height: rawParam,
  custom_title: rawParam,
  disable_animations: booleanParam,
  number_format: rawParam,
  text_bold: booleanParam,
  locale: localeParam,
  border_radius: numberParam,
});

/**
 * Render the organization activity card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderOrgActivity = cardHandler(
  orgActivityQuery,
  { org: 'username' },
  async (
    {
      org,
      days,
      hide,
      show,
      show_icons,
      hide_title,
      hide_border,
      card_width,
      line_height,
      custom_title,
      disable_animations,
      number_format,
      text_bold,
      locale,
      border_radius,
    },
    colors,
    config,
  ) => {
    // the commit count is a REST search of its own, so it is fetched only for a card that draws it
    const data = await fetchOrgActivity(
      { org, days, include_commits: show.includes('commits') },
      config,
    );

    return renderOrgActivityCard(data, {
      ...colors,
      hide,
      show,
      show_icons,
      hide_title,
      hide_border,
      card_width,
      line_height,
      custom_title,
      disable_animations,
      number_format,
      text_bold,
      locale,
      border_radius,
    });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `orgActivity.OPTIONS.show`.
 */
export const orgActivity = Object.assign(renderOrgActivity, {
  OPTIONS: renderOrgActivityCard.OPTIONS,
});
