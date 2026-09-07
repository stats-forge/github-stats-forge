import * as z from 'zod/mini';

import { renderOrganizationCard } from '../cards/organization/index.ts';
import { fetchOrganization } from '../fetchers/organization.ts';

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

/** What the organization endpoint accepts, on top of the shared color params. */
const orgQuery = z.object({
  org: usernameParam,
  hide: listParam,
  show: listParam,
  show_icons: booleanParam,
  hide_title: booleanParam,
  hide_border: booleanParam,
  hide_description: booleanParam,
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
 * Render the organization card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderOrg = cardHandler(
  orgQuery,
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
    const organizationData = await fetchOrganization({ org }, config);

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
 * A UI reads them off the function it calls: `org.OPTIONS.show`.
 */
export const org = Object.assign(renderOrg, { OPTIONS: renderOrganizationCard.OPTIONS });
