import * as z from 'zod/mini';

import { renderRepoCard } from '../cards/repo/index.ts';
import { fetchRepo } from '../fetchers/repo.ts';
import { REPO_USER_SEARCHES } from '../fetchers/stats.ts';

import { cardHandler } from './handler.ts';
import {
  booleanParam,
  commonParams,
  enumListParam,
  intParam,
  safeParam,
  statRowParams,
  usernameParam,
} from './params.ts';

/** What the pin endpoint accepts, on top of the shared color params. */
const pinQuery = z.object({
  username: usernameParam,
  ...commonParams,
  ...statRowParams,
  repo: safeParam,
  card_width: intParam({ px: true }),
  show_owner: booleanParam,
  show: enumListParam(renderRepoCard.OPTIONS.show),
  description_lines_count: intParam(),
});

/**
 * Render the repository card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
const renderPin = cardHandler(
  pinQuery,
  { username: 'username' },
  async (params, colors, config) => {
    const { username, repo, show } = params;
    const repoData = await fetchRepo(
      {
        username,
        reponame: repo,
        searches: REPO_USER_SEARCHES.filter((search) => show.includes(search)),
        include_topics: show.includes('topics'),
      },
      config,
    );
    return renderRepoCard(repoData, { ...params, ...colors });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `pin.OPTIONS.show`.
 */
export const pin = Object.assign(renderPin, { OPTIONS: renderRepoCard.OPTIONS });
