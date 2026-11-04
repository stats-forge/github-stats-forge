import * as z from 'zod/mini';

import { renderOrgCalendarCard } from '../cards/org-calendar/index.ts';
import { ORG_CALENDAR_COUNTS, ORG_CALENDAR_MAX_WEEKS } from '../common/constants.ts';
import { NUMBER_FORMATS } from '../common/render.ts';
import { fetchOrgCalendar } from '../fetchers/org-calendar.ts';

import { cardHandler } from './handler.ts';
import { commonParams, enumParam, intParam, titleParams, usernameParam } from './params.ts';

/** What the organization calendar endpoint accepts, on top of the shared color params. */
const orgCalendarQuery = z.object({
  org: usernameParam,
  ...commonParams,
  ...titleParams,
  count: enumParam(ORG_CALENDAR_COUNTS),
  weeks: intParam({ max: ORG_CALENDAR_MAX_WEEKS }),
  card_width: intParam({ px: true }),
  number_format: enumParam(NUMBER_FORMATS),
  number_precision: intParam({ min: 0 }),
});

/**
 * Render the organization calendar card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderOrgCalendar = cardHandler(
  orgCalendarQuery,
  { org: 'username' },
  async (params, theme, config) => {
    const { org, count, weeks } = params;
    const data = await fetchOrgCalendar({ org, count, weeks }, config);
    return renderOrgCalendarCard(data, { ...params, ...theme });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `orgCalendar.OPTIONS.count`.
 */
export const orgCalendar = Object.assign(renderOrgCalendar, {
  OPTIONS: { ...renderOrgCalendarCard.OPTIONS, count: ORG_CALENDAR_COUNTS },
});
