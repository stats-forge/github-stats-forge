import { describe, expect, it } from 'vitest';

import { I18n } from '../src/common/I18n.ts';
import { statCardLocales } from '../src/translations.ts';

describe(I18n, () => {
  it('should return translated string', () => {
    const i18n = new I18n({
      locale: 'en',
      translations: statCardLocales({ name: 'Anurag Hazra', apostrophe: 's' }),
    });
    expect(i18n.t('statcard.title')).toBe("Anurag Hazra's GitHub Stats");
  });

  it('should throw error if translation string not found', () => {
    const i18n = new I18n({
      locale: 'en',
      translations: statCardLocales({ name: 'Anurag Hazra', apostrophe: 's' }),
    });
    expect(
      // @ts-expect-error using a non-existing key should be reported by ts
      () => i18n.t('statcard.title1'),
    ).toThrow('statcard.title1 Translation string not found');
  });

  it('should fall back to english when the locale has no entry for the key', () => {
    const i18n = new I18n({
      locale: 'fr',
      // a key written in english and not yet translated
      translations: statCardLocales({ name: 'Anurag Hazra', apostrophe: 's' }),
    });
    expect(i18n.t('statcard.all-time-contribs')).toBe('Contributed to (all time)');
  });

  it('should throw error if translation not found for locale', () => {
    const i18n = new I18n({
      locale: 'asdf',
      translations: { 'card.title': { it: 'Titolo' } },
    });
    expect(() => i18n.t('card.title')).toThrow(
      "'card.title' translation not found for locale 'asdf'",
    );
  });
});
