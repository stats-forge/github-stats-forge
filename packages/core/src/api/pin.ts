import * as z from 'zod/mini';

import { renderRepoCard } from '../cards/repo/index.ts';
import { fetchRepo } from '../fetchers/repo.ts';

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
  wrap_description: booleanParam,
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
  async (
    {
      username,
      repo,
      hide_border,
      card_width,
      show_owner,
      wrap_description,
      show,
      show_icons,
      number_format,
      number_precision,
      text_bold,
      line_height,
      locale,
      border_radius,
      description_lines_count,
      disable_animations,
    },
    colors,
    config,
  ) => {
    const repoData = await fetchRepo(
      {
        username,
        reponame: repo,
        include_prs_authored: show.includes('prs_opened'),
        include_prs_commented: show.includes('prs_commented'),
        include_prs_reviewed: show.includes('prs_reviewed'),
        include_issues_authored: show.includes('issues_opened'),
        include_issues_commented: show.includes('issues_commented'),
      },
      config,
    );

    return renderRepoCard(repoData, {
      ...colors,
      hide_border,
      border_radius,
      card_width_input: card_width,
      show_owner,
      wrap_description,
      show,
      show_icons,
      number_format,
      number_precision,
      text_bold,
      line_height,
      username,
      locale,
      description_lines_count,
      disable_animations,
    });
  },
);

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * A UI reads them off the function it calls: `pin.OPTIONS.show`.
 */
export const pin = Object.assign(renderPin, { OPTIONS: renderRepoCard.OPTIONS });
