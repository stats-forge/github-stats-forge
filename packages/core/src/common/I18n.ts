const FALLBACK_LOCALE = 'en';

/** A map of translation keys to per-locale strings. */
type TranslationsMap = Record<string, Record<string, string>>;

/**
 * I18n translation class.
 */
class I18n<Translations extends TranslationsMap = TranslationsMap> {
  locale: string;
  translations: Translations;

  /**
   * @param props Constructor arguments.
   * @param props.locale Locale.
   * @param props.translations Translations.
   */
  constructor({
    locale,
    translations,
  }: {
    // `| undefined`: card callers forward possibly-undefined query options
    locale?: string | undefined;
    translations: Translations;
  }) {
    this.locale = locale || FALLBACK_LOCALE;
    this.translations = translations;
  }

  /**
   * Get translation.
   *
   * @param str String to translate.
   * @returns Translated string.
   */
  t(str: keyof Translations & string): string {
    const translation = this.translations[str];
    // A key the type says is present can still be missing at runtime: a card passes
    // a locale table it built, and `i18n.test.ts` covers exactly that.
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    if (!translation) {
      throw new Error(`${str} Translation string not found`);
    }

    const localized = translation[this.locale];
    if (!localized) {
      throw new Error(`'${str}' translation not found for locale '${this.locale}'`);
    }

    return localized;
  }
}

export { I18n };
