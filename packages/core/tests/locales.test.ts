import { describe, expect, it } from 'vitest';

import { contributedToCardLocales } from '../src/cards/contributed-to/locales.ts';
import { gistCardLocales } from '../src/cards/gist/locales.ts';
import { orgCardLocales } from '../src/cards/organization/locales.ts';
import { repoCardLocales } from '../src/cards/repo/locales.ts';
import { statCardLocales } from '../src/cards/stats/locales.ts';
import { langCardLocales } from '../src/cards/top-languages/locales.ts';
import { wakatimeCardLocales } from '../src/cards/wakatime/locales.ts';
import { isLocaleAvailable } from '../src/common/I18n.ts';
import type { LocaleTable, Phrase } from '../src/common/I18n.ts';

const tables: Array<[string, LocaleTable]> = [
  ['contributedToCardLocales', contributedToCardLocales],
  ['gistCardLocales', gistCardLocales],
  ['langCardLocales', langCardLocales],
  ['orgCardLocales', orgCardLocales],
  ['repoCardLocales', repoCardLocales],
  ['statCardLocales', statCardLocales],
  ['wakatimeCardLocales', wakatimeCardLocales],
];

/** @returns Every `{name}` the wording interpolates, sorted, plus `count` for a plural set. */
const placeholdersOf = (phrase: Phrase): Array<string> => {
  const names = new Set<string>();
  let forms: Array<string | undefined>;

  if (typeof phrase === 'string') {
    forms = [phrase];
  } else {
    // a plural set is chosen by `count`, whether or not one of its forms draws the number
    names.add('count');
    forms = Object.values(phrase);
  }

  for (const form of forms) {
    for (const [, name] of form?.matchAll(/\{(?<name>\w+)\}/g) ?? []) {
      names.add(name ?? '');
    }
  }

  return [...names].toSorted();
};

describe.each(tables)('%s', (_table, locales) => {
  const entries = Object.entries(locales);

  it.each(entries)('%s names only available locales', (_key, phrases) => {
    expect(Object.keys(phrases).filter((locale) => !isLocaleAvailable(locale))).toStrictEqual([]);
  });

  // A `{name}` placeholder used to be a `${name}` the compiler checked. Nothing checks the
  // string form, so this walks every table instead: the card passes what the English wording
  // asks for, so a locale naming anything else throws — and only for the locale that carries
  // it, on the one card that draws it. Naming fewer is a translation's own business: most
  // locales of `statcard.title` have no use for the possessive `{apostrophe}`.
  it.each(entries)('%s interpolates no value english does not supply', (_key, phrases) => {
    const supplied = placeholdersOf(phrases.en);

    for (const [locale, phrase] of Object.entries(phrases)) {
      const unsupplied = placeholdersOf(phrase).filter((name) => !supplied.includes(name));
      expect(unsupplied, `locale '${locale}'`).toStrictEqual([]);
    }
  });
});
