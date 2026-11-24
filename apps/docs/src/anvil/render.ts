/**
 * @file Draws a card from the fictional account, through core's public api handlers.
 *
 * Going through `./api` rather than the renderers walks the path a real request walks, so a
 * rejected option produces the very error card the CLI would.
 */

import { CardConfig } from '@stats-forge/github-stats-forge-core/api';
import type { ApiResult, FetchLike } from '@stats-forge/github-stats-forge-core/api';

import { findCard } from './cards.ts';
import { fixtureFetch } from './fixtures.ts';

/**
 * A request `fetchImpl` cannot answer draws GitHub's error card, rather than a transport failure
 * the retryer waits out.
 *
 * @returns `fetchImpl`, answering what it throws on as GitHub answers an unknown login.
 */
const orNotFound =
  (fetchImpl: FetchLike): FetchLike =>
  async (input, init) => {
    try {
      return await fetchImpl(input, init);
    } catch (error) {
      return Response.json(
        { errors: [{ type: 'NOT_FOUND', message: String(error) }] },
        { status: 404 },
      );
    }
  };

/** The deployment the anvil pretends to be: an unused token, and the fictional account. */
const sampleConfig = new CardConfig({
  pats: [{ name: 'ANVIL', value: 'sample' }],
  fetch: orNotFound(fixtureFetch),
});

/**
 * `options` is the whole query, the params naming whose card it is included: the fixtures answer
 * by what a request asks, not by its variables, so a typed username resolves to the sample's numbers.
 *
 * @returns The rendered card, or the rendered error. Throws only when `cardId` is not a card.
 */
const renderSampleCard = async (
  cardId: string,
  options: Record<string, string>,
): Promise<ApiResult> => {
  const card = findCard(cardId);
  if (card === undefined) {
    throw new Error(`No card called "${cardId}"`);
  }

  return card.render(options, sampleConfig);
};

export { orNotFound, renderSampleCard };
