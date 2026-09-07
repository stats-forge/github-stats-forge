import { CardConfig } from '@stats-forge/github-stats-forge-core/api';
import type { ApiResult } from '@stats-forge/github-stats-forge-core/api';

import { findCard } from './cards.ts';
import { createSampleFetch } from './sample-fetch.ts';
import samples from './samples.json' with { type: 'json' };

/**
 * @file Draws a card from the recorded samples, through core's public api handlers.
 *
 * Going through `./api` rather than the renderers walks the path a real request walks, so a
 * rejected option produces the very error card the CLI would.
 */

/** The deployment the anvil pretends to be: an unused token, and a transport that replays. */
const sampleConfig = new CardConfig({
  pats: [{ name: 'ANVIL', value: 'sample' }],
  fetch: createSampleFetch(samples),
});

/**
 * `options` is the whole query, the params naming whose card it is included: a recording is keyed
 * by what a request asks, not by its variables, so a typed username resolves to recorded numbers.
 *
 * @returns The rendered card, or the rendered error. Throws only when `cardId` is not a card.
 */
const renderSampleCard = (cardId: string, options: Record<string, string>): Promise<ApiResult> => {
  const card = findCard(cardId);
  if (card === undefined) {
    throw new Error(`No card called "${cardId}"`);
  }

  return card.render(options, sampleConfig);
};

export { renderSampleCard };
