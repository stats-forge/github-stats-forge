import { describe, expect, it } from 'vitest';

import { statCardLocales } from '../src/cards/stats/locales.ts';
import { AVAILABLE_LOCALES } from '../src/common/localize.ts';
import type { LocaleTable } from '../src/common/localize.ts';

import { draw } from './_card.ts';
import { cards } from './_cards.ts';

describe.each(Object.entries(cards))('the %s card', (_card, render) => {
  // A wording can only throw in the locale that carries it, so every one is drawn.
  it.each(AVAILABLE_LOCALES)('draws in %s', (locale) => {
    expect(draw(render(locale))).toHaveAttribute('role', 'img');
  });
});

describe('the stats card', () => {
  const table: LocaleTable = statCardLocales;

  // A rank-only card titled with the full card's wording reads as the wrong card.
  it.each(AVAILABLE_LOCALES.filter((locale) => table[locale]?.['rankTitle'] !== undefined))(
    'names the rank, not the stats, in %s',
    (locale) => {
      expect(table[locale]?.['rankTitle']).not.toBe(table[locale]?.['title']);
    },
  );
});
