import { describe, expect, it } from 'vitest';

import { statCardLocales } from '../src/cards/stats/locales.ts';
import { defineLocales, localize } from '../src/common/localize.ts';
import type { LocaleTable } from '../src/common/localize.ts';

describe(localize, () => {
  it('should return translated string', () => {
    const t = localize(statCardLocales, 'en');
    expect(t.totalStars()).toBe('Total Stars Earned');
  });

  it('should fall back to english when the locale has no entry for the key', () => {
    const t = localize(statCardLocales, 'fr');
    // a key written in english and not yet translated
    expect(t.allTimeContribs()).toBe('Contributed to (all time)');
  });

  it('should fall back to english when no locale is asked for', () => {
    const t = localize(statCardLocales);
    expect(t.totalStars()).toBe('Total Stars Earned');
  });

  it('should throw error if translation not found for locale', () => {
    // a table with no english wording, which only a card building one at runtime can
    // reach — `LocaleTable` requires `en` of anything written down
    const table = { title: { it: 'Titolo' } } as unknown as LocaleTable;
    const t = localize(table, 'asdf');
    expect(() => t['title']?.()).toThrow("'title' translation not found for locale 'asdf'");
  });

  describe('interpolation', () => {
    const locales = defineLocales({
      title: { en: "{name}'{apostrophe} stats", it: 'Statistiche di {name}' },
      repeated: { en: '{name}, {name}' },
    });

    it('should substitute a placeholder in the requested locale', () => {
      const t = localize(locales, 'it');
      expect(t.title({ name: 'Anurag Hazra', apostrophe: 's' })).toBe(
        'Statistiche di Anurag Hazra',
      );
    });

    it('should substitute every occurrence of a placeholder', () => {
      const t = localize(locales, 'en');
      expect(t.repeated({ name: 'Anurag' })).toBe('Anurag, Anurag');
    });

    it('should leave a value that looks like a placeholder alone', () => {
      const t = localize(locales, 'en');
      expect(t.repeated({ name: '{apostrophe}' })).toBe('{apostrophe}, {apostrophe}');
    });

    it('should throw when the wording needs a value it was not given', () => {
      const t = localize(locales, 'en');
      expect(() =>
        // @ts-expect-error omitting a value the wording declares should be reported by ts
        t.title({ name: 'Anurag Hazra' }),
      ).toThrow("'title' needs a value for '{apostrophe}'");
    });
  });

  describe('plural forms', () => {
    const locales = defineLocales({
      repos: { en: { one: '{count} repository', other: '{count} repositories' } },
      // Russian distinguishes a category english has no wording for
      commits: {
        en: { one: '{count} commit', other: '{count} commits' },
        ru: { one: '{count} коммит', few: '{count} коммита', other: '{count} коммитов' },
      },
    });

    it.each([
      [0, '0 repositories'],
      [1, '1 repository'],
      [2, '2 repositories'],
    ])('should pick the form the count calls for (%i)', (count, expected) => {
      const t = localize(locales, 'en');
      expect(t.repos({ count })).toBe(expected);
    });

    it.each([
      [1, '1 коммит'],
      [3, '3 коммита'],
      // `many`, which this table has no wording for, so `other` answers for it
      [11, '11 коммитов'],
    ])("should pick it by the locale's own rules (%i)", (count, expected) => {
      const t = localize(locales, 'ru');
      expect(t.commits({ count })).toBe(expected);
    });

    it('should fall back to english, and to english rules, for an untranslated key', () => {
      const t = localize(locales, 'ru');
      expect(t.repos({ count: 3 })).toBe('3 repositories');
    });
  });
});
