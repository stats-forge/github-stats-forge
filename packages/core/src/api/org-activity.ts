import * as z from 'zod/mini';

import { renderOrgActivityCard } from '../cards/org-activity/index.ts';
import { fetchOrgActivity } from '../fetchers/org-activity.ts';

import { cardHandler } from './handler.ts';
import {
  commonParams,
  DAYS_OR_RANGE,
  enumListParam,
  fromParam,
  intParam,
  ORDERED_RANGE,
  statRowParams,
  titleParams,
  toParam,
  usernameParam,
} from './params.ts';

/** Every stat the card draws: `show` and `hide` each accept any of them. */
const STATS = [
  ...renderOrgActivityCard.OPTIONS.hide,
  ...renderOrgActivityCard.OPTIONS.show,
] as const;

/** What the organization activity endpoint accepts, on top of the shared color params. */
const orgActivityQuery = z
  .object({
    org: usernameParam,
    ...commonParams,
    ...titleParams,
    ...statRowParams,
    days: intParam(),
    from: fromParam,
    to: toParam,
    hide: enumListParam(STATS, renderOrgActivityCard.OPTIONS.hide),
    show: enumListParam(STATS, renderOrgActivityCard.OPTIONS.show),
    card_width: intParam({ px: true }),
  })
  .check(ORDERED_RANGE)
  .check(DAYS_OR_RANGE);

/**
 * Render the organization activity card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderOrgActivity = cardHandler(
  orgActivityQuery,
  { org: 'username' },
  async (params, colors, config) => {
    const { org, days, from, to, show, hide } = params;
    // a stat shown and hidden is not drawn, and a stat not drawn is not fetched
    const drawn = new Set(show.filter((stat) => !hide.includes(stat)));

    // the commit count is a REST search of its own, so it is fetched only for a card that draws it
    const data = await fetchOrgActivity(
      {
        org,
        days,
        from,
        to,
        include_commits: drawn.has('commits'),
        // both rows are drawn unless hidden, so hiding both is how a query says it wants
        // the card from a token that may not read issues
        require_issues: !hide.includes('issues_opened') || !hide.includes('issues_closed'),
      },
      config,
    );
    return renderOrgActivityCard(data, { ...params, ...colors });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `orgActivity.OPTIONS.show`.
 */
export const orgActivity = Object.assign(renderOrgActivity, {
  OPTIONS: renderOrgActivityCard.OPTIONS,
});
