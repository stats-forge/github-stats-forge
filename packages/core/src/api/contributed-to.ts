import * as z from 'zod/mini';

import { renderContributedToCard } from '../cards/contributed-to.ts';
import type { CardConfig } from '../common/config.ts';
import { fetchContributedTo } from '../fetchers/contributed-to.ts';

import type { ApiResult } from './api-result.ts';
import { errorResult } from './api-result.ts';
import type { ApiQuery } from './params.ts';
import {
  booleanParam,
  looseIntParam,
  numberParam,
  parseColorParams,
  parseParams,
  rawParam,
  safeListParam,
  usernameParam,
} from './params.ts';

/** What the contributed-to endpoint accepts, on top of the shared color params. */
const contributedToQuery = z.object({
  username: usernameParam,
  repos_count: looseIntParam,
  include_own_repos: booleanParam,
  exclude_repo: safeListParam,
  hide_years: booleanParam,
  hide_title: booleanParam,
  hide_border: booleanParam,
  card_width: looseIntParam,
  custom_title: rawParam,
  border_radius: numberParam,
  disable_animations: booleanParam,
});

/** The query this endpoint accepts, checked against the schema above. */
type ContributedToApiQuery = ApiQuery<typeof contributedToQuery>;

/**
 * Render the contributed-to card for a set of query params.
 *
 * The card draws no translated text, so it takes no `locale`:
 * `custom_title` is what replaces its one English line.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderContributedTo = async (
  query: ContributedToApiQuery,
  config: CardConfig,
): Promise<ApiResult> => {
  let colors;
  try {
    colors = parseColorParams(query);
  } catch (error) {
    // A rejected color cannot be used to draw its own error card.
    return errorResult(error);
  }

  try {
    const {
      username,
      repos_count,
      include_own_repos,
      exclude_repo,
      hide_years,
      hide_title,
      hide_border,
      card_width,
      custom_title,
      border_radius,
      disable_animations,
    } = parseParams(contributedToQuery, query);

    const contributedTo = await fetchContributedTo(
      { username, include_own_repos, repos_count, exclude_repo },
      config,
    );

    return {
      status: 'success',
      content: renderContributedToCard(contributedTo, {
        ...colors,
        hide_years,
        hide_title,
        hide_border,
        card_width,
        custom_title,
        border_radius,
        disable_animations,
      }),
    };
  } catch (error) {
    return errorResult(error, colors);
  }
};

export const contributedTo = renderContributedTo;
