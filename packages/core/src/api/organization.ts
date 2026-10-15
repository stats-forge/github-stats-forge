import * as z from 'zod/mini';

import { renderOrganizationCard } from '../cards/organization/index.ts';
import { fetchOrganization } from '../fetchers/organization.ts';

import { cardHandler } from './handler.ts';
import {
  booleanParam,
  commonParams,
  enumListParam,
  intParam,
  statRowParams,
  titleParams,
  usernameParam,
} from './params.ts';

/** Every stat the card draws: `show` and `hide` each accept any of them. */
const STATS = [
  ...renderOrganizationCard.OPTIONS.hide,
  ...renderOrganizationCard.OPTIONS.show,
] as const;

/** What the organization endpoint accepts, on top of the shared color params. */
const orgQuery = z.object({
  org: usernameParam,
  ...commonParams,
  ...titleParams,
  ...statRowParams,
  hide: enumListParam(STATS, renderOrganizationCard.OPTIONS.hide),
  show: enumListParam(STATS, renderOrganizationCard.OPTIONS.show),
  hide_description: booleanParam,
  card_width: intParam({ px: true }),
});

/**
 * Render the organization card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderOrg = cardHandler(
  orgQuery,
  { org: 'username' },
  async (
    {
      org,
      hide,
      show,
      show_icons,
      hide_title,
      hide_border,
      hide_description,
      card_width,
      line_height,
      title,
      disable_animations,
      number_format,
      number_precision,
      text_bold,
      locale,
      border_radius,
    },
    colors,
    config,
  ) => {
    // a stat shown and hidden is not drawn, and a stat not drawn is not fetched
    const drawn = new Set(show.filter((stat) => !hide.includes(stat)));

    // the member count is the one stat a token can be refused, so only a query asking for
    // it is told: `show=members` is what turns that refusal into an error card
    const organizationData = await fetchOrganization(
      { org, require_members: drawn.has('members') },
      config,
    );

    return renderOrganizationCard(organizationData, {
      ...colors,
      hide,
      show,
      show_icons,
      hide_title,
      hide_border,
      hide_description,
      card_width,
      line_height,
      title,
      disable_animations,
      number_format,
      number_precision,
      text_bold,
      locale,
      border_radius,
    });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `org.OPTIONS.show`.
 */
export const org = Object.assign(renderOrg, { OPTIONS: renderOrganizationCard.OPTIONS });
