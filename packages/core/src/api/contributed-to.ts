import * as z from 'zod/mini';

import { renderContributedToCard } from '../cards/contributed-to/index.ts';
import { fetchContributedTo } from '../fetchers/contributed-to.ts';

import { cardHandler } from './handler.ts';
import {
  booleanParam,
  commonParams,
  fromParam,
  intParam,
  ORDERED_RANGE,
  safeListParam,
  titleParams,
  toParam,
  usernameParam,
} from './params.ts';

/** What the contributed-to endpoint accepts, on top of the shared color params. */
const contributedToQuery = z
  .object({
    username: usernameParam,
    ...commonParams,
    ...titleParams,
    repos_count: intParam(),
    include_own_repos: booleanParam,
    exclude_repo: safeListParam,
    from: fromParam,
    to: toParam,
    hide_years: booleanParam,
    card_width: intParam({ px: true }),
  })
  .check(ORDERED_RANGE);

/**
 * Render the contributed-to card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
export const contributedTo = cardHandler(
  contributedToQuery,
  { username: 'username' },
  async (params, colors, config) => {
    const { username, include_own_repos, repos_count, exclude_repo, from, to } = params;
    const data = await fetchContributedTo(
      { username, include_own_repos, repos_count, exclude_repo, from, to },
      config,
    );
    return renderContributedToCard(data, { ...params, ...colors });
  },
);
