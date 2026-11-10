import { globSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { contributedToCardLocales } from '../src/cards/contributed-to/locales.ts';
import { gistCardLocales } from '../src/cards/gist/locales.ts';
import { orgActivityCardLocales } from '../src/cards/org-activity/locales.ts';
import { orgCalendarCardLocales } from '../src/cards/org-calendar/locales.ts';
import { orgCardLocales } from '../src/cards/organization/locales.ts';
import { repoCardLocales } from '../src/cards/repo/locales.ts';
import { statCardLocales } from '../src/cards/stats/locales.ts';
import { langCardLocales } from '../src/cards/top-languages/locales.ts';
import { wakatimeCardLocales } from '../src/cards/wakatime/locales.ts';
import { commonLocales } from '../src/common/locales.ts';
import { AVAILABLE_LOCALES } from '../src/common/localize.ts';
import type { LocaleTable } from '../src/common/localize.ts';

import { draw } from './_card.ts';
import { cards } from './_cards.ts';

const tables: Record<string, LocaleTable> = {
  'cards/contributed-to/locales.ts': contributedToCardLocales,
  'cards/gist/locales.ts': gistCardLocales,
  'cards/org-activity/locales.ts': orgActivityCardLocales,
  'cards/org-calendar/locales.ts': orgCalendarCardLocales,
  'cards/organization/locales.ts': orgCardLocales,
  'cards/repo/locales.ts': repoCardLocales,
  'cards/stats/locales.ts': statCardLocales,
  'cards/top-languages/locales.ts': langCardLocales,
  'cards/wakatime/locales.ts': wakatimeCardLocales,
  'common/locales.ts': commonLocales,
};

describe('the locale tables', () => {
  it('lists every table', () => {
    // copied into this realm: vmThreads hands back node:fs's own Array, which toStrictEqual rejects
    const found = [...globSync('**/locales.ts', { cwd: join(import.meta.dirname, '../src') })];
    expect(found.toSorted()).toStrictEqual(Object.keys(tables).toSorted());
  });

  // A locale falls back to English for a key it lacks, so a deleted translation shows nowhere else.
  it.each(Object.entries(tables))('%s keeps its translations', (_file, table) => {
    const translated = AVAILABLE_LOCALES.filter((locale) => locale !== 'en')
      .map(
        (locale) =>
          [
            locale,
            Object.keys(table.en).filter((key) => table[locale]?.[key] !== undefined),
          ] as const,
      )
      .filter(([, keys]) => keys.length > 0);
    expect(Object.fromEntries(translated)).toMatchSnapshot();
  });
});

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
