import * as z from "zod/mini";

import { renderRepoCard } from "../cards/repo.js";
import type { CardConfig } from "../common/config.js";
import { fetchRepo } from "../fetchers/repo.js";

import type { ApiResult } from "./api-result.js";
import { permanentError, temporaryError } from "./api-result.js";
import type { ApiQuery } from "./params.js";
import {
  booleanParam,
  listParam,
  localeParam,
  looseIntParam,
  numberParam,
  parseColorParams,
  parseParams,
  rawParam,
  safeParam,
} from "./params.js";

const UNSAFE_NAME = "Username or repository contains unsafe characters";

/** What the pin endpoint accepts, on top of the shared color params. */
const pinQuery = z.object({
  username: safeParam(UNSAFE_NAME),
  repo: safeParam(UNSAFE_NAME),
  hide_border: booleanParam,
  card_width: looseIntParam,
  show_owner: booleanParam,
  browser_rendering: booleanParam,
  show: listParam,
  show_icons: booleanParam,
  number_format: rawParam,
  text_bold: booleanParam,
  line_height: rawParam,
  locale: localeParam,
  border_radius: numberParam("border_radius"),
  description_lines_count: looseIntParam,
});

/** The query this endpoint accepts, checked against the schema above. */
type PinApiQuery = ApiQuery<typeof pinQuery>;

/**
 * Render the repository card for a set of query params.
 *
 * @param query Raw query params, plus any of the shared color params.
 * @param query.username GitHub username the repository belongs to.
 * @param query.repo Repository name.
 * @param query.hide_border Whether to hide the card border.
 * @param query.card_width Card width.
 * @param query.show_owner Whether to show the repository owner.
 * @param query.browser_rendering Whether the browser wraps the description text.
 * @param query.show Comma-separated extra stats to show.
 * @param query.show_icons Whether to show the stat icons.
 * @param query.number_format How numbers are abbreviated.
 * @param query.text_bold Whether the stat values are bold.
 * @param query.line_height Line height between the stats.
 * @param query.locale Language the card is rendered in.
 * @param query.border_radius Card border radius.
 * @param query.description_lines_count Lines the description is wrapped to.
 * @param config Deployment config supplying the PAT pool.
 * @returns The rendered card, or a rendered error.
 */
export default async (
  query: PinApiQuery,
  config: CardConfig,
): Promise<ApiResult> => {
  const colors = parseColorParams(query);
  if (!colors.ok) {
    return permanentError(colors.secondaryMessage);
  }

  const parsed = parseParams(pinQuery, query);
  if (!parsed.ok) {
    return permanentError(parsed.secondaryMessage, colors.params);
  }
  const {
    username,
    repo,
    hide_border,
    card_width,
    show_owner,
    browser_rendering,
    show,
    show_icons,
    number_format,
    text_bold,
    line_height,
    locale,
    border_radius,
    description_lines_count,
  } = parsed.params;

  try {
    const repoData = await fetchRepo(
      config,
      username,
      repo,
      show.includes("prs_authored"),
      show.includes("prs_commented"),
      show.includes("prs_reviewed"),
      show.includes("issues_authored"),
      show.includes("issues_commented"),
    );

    return {
      status: "success",
      content: renderRepoCard(repoData, {
        ...colors.params,
        hide_border,
        border_radius,
        card_width_input: card_width,
        show_owner,
        browser_rendering,
        show,
        show_icons,
        number_format,
        text_bold,
        line_height,
        username,
        locale,
        description_lines_count,
      }),
    };
  } catch (err) {
    return temporaryError(err, colors.params);
  }
};
