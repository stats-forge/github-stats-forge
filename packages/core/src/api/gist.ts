import * as z from 'zod/mini';

import { renderGistCard } from '../cards/gist.ts';
import { fetchGist } from '../fetchers/gist.ts';

import { cardHandler } from './handler.ts';
import { booleanParam, localeParam, numberParam, safeParam } from './params.ts';

/** What the gist endpoint accepts, on top of the shared color params. */
const gistQuery = z.object({
  id: safeParam,
  locale: localeParam,
  border_radius: numberParam,
  show_owner: booleanParam,
  browser_rendering: booleanParam,
  hide_border: booleanParam,
});

/**
 * Render the gist card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
export const gist = cardHandler(
  gistQuery,
  async (
    { id, locale, border_radius, show_owner, browser_rendering, hide_border },
    colors,
    config,
  ) => {
    const gistData = await fetchGist({ id }, config);

    return renderGistCard(gistData, {
      ...colors,
      locale,
      border_radius,
      show_owner,
      browser_rendering,
      hide_border,
    });
  },
);
