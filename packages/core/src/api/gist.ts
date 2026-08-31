import * as z from "zod/mini";

import { renderGistCard } from "../cards/gist.js";
import type { CardConfig } from "../common/config.js";
import { fetchGist } from "../fetchers/gist.js";

import type { ApiResult } from "./api-result.js";
import { permanentError, temporaryError } from "./api-result.js";
import type { ApiQuery } from "./params.js";
import {
  booleanParam,
  numberParam,
  parseColorParams,
  parseParams,
  safeParam,
} from "./params.js";

/** What the gist endpoint accepts, on top of the shared color params. */
const gistQuery = z.object({
  id: safeParam("Gist ID contains unsafe characters"),
  border_radius: numberParam("border_radius"),
  show_owner: booleanParam,
  browser_rendering: booleanParam,
  hide_border: booleanParam,
});

/** The query this endpoint accepts, checked against the schema above. */
type GistApiQuery = ApiQuery<typeof gistQuery>;

/**
 * Render the gist card for a set of query params.
 *
 * @param query Raw query params, plus any of the shared color params.
 * @param query.id GitHub gist ID.
 * @param query.border_radius Card border radius.
 * @param query.show_owner Whether to show the gist owner.
 * @param query.browser_rendering Whether the browser wraps the description text.
 * @param query.hide_border Whether to hide the card border.
 * @param config Deployment config supplying the PAT pool.
 * @returns The rendered card, or a rendered error.
 */
export default async (
  query: GistApiQuery,
  config: CardConfig,
): Promise<ApiResult> => {
  const colors = parseColorParams(query);
  if (!colors.ok) {
    return permanentError(colors.secondaryMessage);
  }

  const parsed = parseParams(gistQuery, query);
  if (!parsed.ok) {
    return permanentError(parsed.secondaryMessage, colors.params);
  }
  const { id, border_radius, show_owner, browser_rendering, hide_border } =
    parsed.params;

  try {
    const gistData = await fetchGist(config, id);

    return {
      status: "success",
      content: renderGistCard(gistData, {
        ...colors.params,
        border_radius,
        show_owner,
        browser_rendering,
        hide_border,
      }),
    };
  } catch (err) {
    return temporaryError(err, colors.params);
  }
};
