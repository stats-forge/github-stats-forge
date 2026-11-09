import { describe, expect, it } from 'vitest';

import { statCardLocales } from '../src/cards/stats/locales.ts';
import { defineLocales, localize } from '../src/common/localize.ts';

describe(localize, () => {
  it('should return translated string', () => {
    const t = localize(statCardLocales, 'en');
    expect(t.totalStars()).toBe('Total Stars Earned');
  });

  it('should fall back to english when the locale has no entry for the key', () => {
    const t = localize(statCardLocales, 'fr');
    // a key written in english and not yet translated
    expect(t.contributedToAllTime()).toBe('Contributed to (all time)');
  });

  it('should fall back to english when no locale is asked for', () => {
    const t = localize(statCardLocales);
    expect(t.totalStars()).toBe('Total Stars Earned');
  });

  // Only the compiler refuses these: at runtime a table is handed back untouched.
  describe('the tables it refuses to declare', () => {
    it('should refuse a locale no card can be asked for', () => {
      // `kr` is resolved to `ko` before a card draws, so a wording written under it is dead
      // @ts-expect-error a wording under an unlisted code should be reported by ts
      const table = defineLocales({ en: { title: 'Title' }, kr: { title: '제목' } });
      expect(table).toHaveProperty('kr.title', '제목');
    });

    it('should refuse a key english does not declare', () => {
      // @ts-expect-error a key the fallback lacks is left over from a rename, and never drawn
      const table = defineLocales({ en: { title: 'Title' }, it: { heading: 'Titolo' } });
      expect(table).toHaveProperty('it.heading', 'Titolo');
    });

    it('should refuse a placeholder english does not supply', () => {
      const table = defineLocales({
        en: { title: 'Stats' },
        // @ts-expect-error the card passes what the english wording asks for, so this would throw
        it: { title: 'Statistiche di {name}' },
      });
      expect(table).toHaveProperty('it.title', 'Statistiche di {name}');
    });

    it('should refuse plural forms for a wording english gives no count', () => {
      const table = defineLocales({
        en: { title: 'Repositories' },
        // @ts-expect-error a plural form needs a `count`, which the card never passes here
        it: { title: { one: 'Repository', other: 'Repository' } },
      });
      expect(table).toHaveProperty('it.title.other', 'Repository');
    });

    it('should refuse a plural form under a category no locale has', () => {
      const table = defineLocales({
        en: { repos: { one: '{count} repo', other: '{count} repos' } },
        // @ts-expect-error `fwe` is no plural category, so its form would never be drawn
        ru: { repos: { one: '{count} репо', fwe: '{count} репо', other: '{count} репо' } },
      });
      expect(table).toHaveProperty('ru.repos.fwe', '{count} репо');
    });
  });

  describe('interpolation', () => {
    const locales = defineLocales({
      en: { title: "{name}'{apostrophe} stats", repeated: '{name}, {name}' },
      it: { title: 'Statistiche di {name}' },
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
      en: {
        repos: { one: '{count} repository', other: '{count} repositories' },
        commits: { one: '{count} commit', other: '{count} commits' },
        stars: { one: '{count} star', other: '{count} stars' },
      },
      // Russian distinguishes a category english has no wording for
      ru: { commits: { one: '{count} коммит', few: '{count} коммита', other: '{count} коммитов' } },
      // Chinese has no singular; a `one` here is what english rules would wrongly pick
      'zh-cn': { stars: { one: '一颗星', other: '{count} 颗星' } },
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

    it('should pick it by the rules of a locale with no singular', () => {
      const t = localize(locales, 'zh-cn');
      expect(t.stars({ count: 1 })).toBe('1 颗星');
    });

    it('should fall back to english, and to english rules, for an untranslated key', () => {
      const t = localize(locales, 'ru');
      expect(t.repos({ count: 3 })).toBe('3 repositories');
    });
  });
});
