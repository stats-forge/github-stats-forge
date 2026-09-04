import * as z from 'zod/mini';

import { renderGistCard } from '../cards/gist.ts';
import type { CardConfig } from '../common/config.ts';
import { fetchGist } from '../fetchers/gist.ts';

import type { ApiResult } from './api-result.ts';
import { errorResult } from './api-result.ts';
import type { ApiQuery } from './params.ts';
import { booleanParam, numberParam, parseColorParams, parseParams, safeParam } from './params.ts';

/** What the gist endpoint accepts, on top of the shared color params. */
const gistQuery = z.object({
  id: safeParam,
  border_radius: numberParam,
  show_owner: booleanParam,
  browser_rendering: booleanParam,
  hide_border: booleanParam,
});

/** The query this endpoint accepts, checked against the schema above. */
type GistApiQuery = ApiQuery<typeof gistQuery>;

/**
 * Render the gist card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
export const gist = async (query: GistApiQuery, config: CardConfig): Promise<ApiResult> => {
  let colors;
  try {
    colors = parseColorParams(query);
  } catch (error) {
    // A rejected color cannot be used to draw its own error card.
    return errorResult(error);
  }

  try {
    const { id, border_radius, show_owner, browser_rendering, hide_border } = parseParams(
      gistQuery,
      query,
    );

    const gistData = await fetchGist({ id }, config);

    return {
      status: 'success',
      content: renderGistCard(gistData, {
        ...colors,
        border_radius,
        show_owner,
        browser_rendering,
        hide_border,
      }),
    };
  } catch (error) {
    return errorResult(error, colors);
  }
};
