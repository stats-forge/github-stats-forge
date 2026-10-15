import * as z from 'zod/mini';

import { renderGistCard } from '../cards/gist/index.ts';
import { fetchGist } from '../fetchers/gist.ts';

import { cardHandler } from './handler.ts';
import { booleanParam, commonParams, safeParam } from './params.ts';

/** What the gist endpoint accepts, on top of the shared color params. */
const gistQuery = z.object({
  id: safeParam,
  ...commonParams,
  show_owner: booleanParam,
});

/**
 * Render the gist card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
export const gist = cardHandler(
  gistQuery,
  { id: 'gist' },
  async (
    { id, locale, border_radius, show_owner, hide_border, disable_animations },
    colors,
    config,
  ) => {
    const gistData = await fetchGist({ id }, config);

    return renderGistCard(gistData, {
      ...colors,
      locale,
      border_radius,
      show_owner,

      hide_border,
      disable_animations,
    });
  },
);
