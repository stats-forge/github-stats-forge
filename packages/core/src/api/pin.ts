import * as z from 'zod/mini';

import { renderRepoCard } from '../cards/repo.ts';
import type { CardConfig } from '../common/config.ts';
import { fetchRepo } from '../fetchers/repo.ts';

import type { ApiResult } from './api-result.ts';
import { errorResult } from './api-result.ts';
import type { ApiQuery } from './params.ts';
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
  usernameParam,
} from './params.ts';

/** What the pin endpoint accepts, on top of the shared color params. */
const pinQuery = z.object({
  username: usernameParam,
  repo: safeParam,
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
  border_radius: numberParam,
  description_lines_count: looseIntParam,
});

/** The query this endpoint accepts, checked against the schema above. */
type PinApiQuery = ApiQuery<typeof pinQuery>;

/**
 * Render the repository card for a set of query params.
 *
 * @returns The rendered card, or a rendered error.
 */
export const pin = async (query: PinApiQuery, config: CardConfig): Promise<ApiResult> => {
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
    } = parseParams(pinQuery, query);

    const repoData = await fetchRepo(
      {
        username,
        reponame: repo,
        include_prs_authored: show.includes('prs_authored'),
        include_prs_commented: show.includes('prs_commented'),
        include_prs_reviewed: show.includes('prs_reviewed'),
        include_issues_authored: show.includes('issues_authored'),
        include_issues_commented: show.includes('issues_commented'),
      },
      config,
    );

    return {
      status: 'success',
      content: renderRepoCard(repoData, {
        ...colors,
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
  } catch (error) {
    return errorResult(error, colors);
  }
};
