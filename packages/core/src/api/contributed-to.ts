import * as z from 'zod/mini';

import { renderContributedToCard } from '../cards/contributed-to.ts';
import { fetchContributedTo } from '../fetchers/contributed-to.ts';

import { cardHandler } from './handler.ts';
import {
  booleanParam,
  fromParam,
  localeParam,
  looseIntParam,
  numberParam,
  ORDERED_RANGE,
  rawParam,
  safeListParam,
  toParam,
  usernameParam,
} from './params.ts';

/** What the contributed-to endpoint accepts, on top of the shared color params. */
const contributedToQuery = z
  .object({
    username: usernameParam,
    locale: localeParam,
    repos_count: looseIntParam,
    include_own_repos: booleanParam,
    exclude_repo: safeListParam,
    from: fromParam,
    to: toParam,
    hide_years: booleanParam,
    hide_title: booleanParam,
    hide_border: booleanParam,
    card_width: looseIntParam,
    custom_title: rawParam,
    border_radius: numberParam,
    disable_animations: booleanParam,
  })
  .check(ORDERED_RANGE);

/**
 * Render the contributed-to card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
export const contributedTo = cardHandler(
  contributedToQuery,
  async (
    {
      username,
      locale,
      repos_count,
      include_own_repos,
      exclude_repo,
      from,
      to,
      hide_years,
      hide_title,
      hide_border,
      card_width,
      custom_title,
      border_radius,
      disable_animations,
    },
    colors,
    config,
  ) => {
    const data = await fetchContributedTo(
      { username, include_own_repos, repos_count, exclude_repo, from, to },
      config,
    );

    return renderContributedToCard(data, {
      ...colors,
      locale,
      hide_years,
      hide_title,
      hide_border,
      card_width,
      custom_title,
      border_radius,
      disable_animations,
    });
  },
);
