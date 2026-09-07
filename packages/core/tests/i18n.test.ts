import { describe, expect, it } from 'vitest';

import { statCardLocales } from '../src/cards/stats/locales.ts';
import { I18n, defineLocales } from '../src/common/I18n.ts';
import type { LocaleTable } from '../src/common/I18n.ts';

describe(I18n, () => {
  it('should return translated string', () => {
    const i18n = new I18n({ locale: 'en', translations: statCardLocales });
    expect(i18n.t('statcard.totalstars')).toBe('Total Stars Earned');
  });

  it('should throw error if translation string not found', () => {
    const i18n = new I18n({ locale: 'en', translations: statCardLocales });
    expect(
      // @ts-expect-error using a non-existing key should be reported by ts
      () => i18n.t('statcard.title1'),
    ).toThrow('statcard.title1 Translation string not found');
  });

  it('should fall back to english when the locale has no entry for the key', () => {
    const i18n = new I18n({ locale: 'fr', translations: statCardLocales });
    // a key written in english and not yet translated
    expect(i18n.t('statcard.all-time-contribs')).toBe('Contributed to (all time)');
  });

  it('should throw error if translation not found for locale', () => {
    const i18n = new I18n<LocaleTable>({
      locale: 'asdf',
      // a table with no english wording, which only a card building one at runtime can
      // reach — `LocaleTable` requires `en` of anything written down
      translations: { 'card.title': { it: 'Titolo' } } as unknown as LocaleTable,
    });
    expect(() => i18n.t('card.title')).toThrow(
      "'card.title' translation not found for locale 'asdf'",
    );
  });

  describe('interpolation', () => {
    const locales = defineLocales({
      'card.title': { en: "{name}'{apostrophe} stats", it: 'Statistiche di {name}' },
      'card.repeated': { en: '{name}, {name}' },
    });

    it('should substitute a placeholder in the requested locale', () => {
      const i18n = new I18n({ locale: 'it', translations: locales });
      expect(i18n.t('card.title', { name: 'Anurag Hazra', apostrophe: 's' })).toBe(
        'Statistiche di Anurag Hazra',
      );
    });

    it('should substitute every occurrence of a placeholder', () => {
      const i18n = new I18n({ locale: 'en', translations: locales });
      expect(i18n.t('card.repeated', { name: 'Anurag' })).toBe('Anurag, Anurag');
    });

    it('should leave a value that looks like a placeholder alone', () => {
      const i18n = new I18n({ locale: 'en', translations: locales });
      expect(i18n.t('card.repeated', { name: '{apostrophe}' })).toBe('{apostrophe}, {apostrophe}');
    });

    it('should throw when the wording needs a value it was not given', () => {
      const i18n = new I18n({ locale: 'en', translations: locales });
      expect(() =>
        // @ts-expect-error omitting a value the wording declares should be reported by ts
        i18n.t('card.title', { name: 'Anurag Hazra' }),
      ).toThrow("'card.title' needs a value for '{apostrophe}'");
    });
  });

  describe('plural forms', () => {
    const locales = defineLocales({
      'card.repos': { en: { one: '{count} repository', other: '{count} repositories' } },
      // Russian distinguishes a category english has no wording for
      'card.commits': {
        en: { one: '{count} commit', other: '{count} commits' },
        ru: { one: '{count} коммит', few: '{count} коммита', other: '{count} коммитов' },
      },
    });

    it.each([
      [0, '0 repositories'],
      [1, '1 repository'],
      [2, '2 repositories'],
    ])('should pick the form the count calls for (%i)', (count, expected) => {
      const i18n = new I18n({ locale: 'en', translations: locales });
      expect(i18n.t('card.repos', { count })).toBe(expected);
    });

    it.each([
      [1, '1 коммит'],
      [3, '3 коммита'],
      // `many`, which this table has no wording for, so `other` answers for it
      [11, '11 коммитов'],
    ])("should pick it by the locale's own rules (%i)", (count, expected) => {
      const i18n = new I18n({ locale: 'ru', translations: locales });
      expect(i18n.t('card.commits', { count })).toBe(expected);
    });

    it('should fall back to english, and to english rules, for an untranslated key', () => {
      const i18n = new I18n({ locale: 'ru', translations: locales });
      expect(i18n.t('card.repos', { count: 3 })).toBe('3 repositories');
    });
  });
});
