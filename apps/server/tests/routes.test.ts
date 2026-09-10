import { cards } from '@stats-forge/github-stats-forge-cli/cards';
import * as api from '@stats-forge/github-stats-forge-core/api';
import { describe, expect, it } from 'vitest';

import { CARD_ROUTES, cardIdFor, normalizePath } from '../src/routes.ts';

/** The path each card is served at, without the prefix. */
const routedIds = [...CARD_ROUTES.keys()].map((path) => path.slice('/api/'.length));

describe('the route table', () => {
  it('serves every card core exports', () => {
    // `OPTIONS` is what tells a card apart from `CardConfig` and `themes` in the same module
    const routed = new Set<unknown>(CARD_ROUTES.values());
    const unrouted = Object.entries<unknown>(api)
      .filter(([, value]) => typeof value === 'function' && 'OPTIONS' in value)
      .filter(([, handler]) => !routed.has(handler))
      .map(([name]) => name);

    expect(unrouted).toStrictEqual([]);
  });

  it('names each path after the card, as the CLI names it', () => {
    expect(routedIds.toSorted()).toStrictEqual(cards.map((card) => card.id).toSorted());
  });

  it('routes nothing but a card under /api', () => {
    expect(CARD_ROUTES.get('/api/themes')).toBeUndefined();
    expect(cardIdFor('/api/themes')).toBeUndefined();
    expect(cardIdFor('/api/top-langs')).toBe('top-langs');
  });
});

describe(normalizePath, () => {
  it('resolves a trailing slash to the route without one', () => {
    expect(normalizePath('/api/stats/')).toBe('/api/stats');
  });

  it('leaves the root alone, its slash being the whole path', () => {
    expect(normalizePath('/')).toBe('/');
  });
});
