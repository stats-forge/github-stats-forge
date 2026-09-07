/**
 * Every locale a card can be asked for.
 *
 * A key is written in `en` first and translated afterwards, so a card's table need not
 * carry every locale — `I18n#t` falls back. This list is what the api accepts.
 *
 * @see https://www.andiamo.co.uk/resources/iso-language-codes/ for language codes.
 */
const AVAILABLE_LOCALES = [
  'en',
  'ar',
  'az',
  'bg',
  'bn',
  'ca',
  'cn',
  'zh-tw',
  'cs',
  'de',
  'sw',
  'ur',
  'es',
  'fa',
  'fi',
  'fr',
  'hi',
  'sa',
  'hu',
  'it',
  'ja',
  'kr',
  'nl',
  'pt-pt',
  'pt-br',
  'np',
  'el',
  'ro',
  'ru',
  'uk-ua',
  'id',
  'ml',
  'my',
  'ta',
  'sk',
  'tr',
  'pl',
  'uz',
  'vi',
  'se',
  'he',
  'fil',
  'th',
  'sr',
  'sr-latn',
  'no',
  'be',
] as const;

const FALLBACK_LOCALE = 'en';

/**
 * Checks whether the locale is available or not.
 *
 * @returns Boolean specifying whether the locale is available or not.
 */
const isLocaleAvailable = (locale: string): boolean =>
  (AVAILABLE_LOCALES as ReadonlyArray<string>).includes(locale.toLowerCase());

/**
 * A count-dependent wording: one form per plural category the locale distinguishes.
 *
 * `other` is the form every locale has, so it is what an unwritten category falls back to.
 */
type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/** One locale's wording for a key, either outright or a form per plural category. */
type Phrase = string | PluralForms;

/**
 * A card's translations: a key, then that key's wording per locale.
 *
 * `en` is required because it is what every other locale falls back to; the rest are
 * checked against {@link AVAILABLE_LOCALES} by `tests/locales.test.ts`.
 */
type LocaleTable = Record<string, { en: Phrase } & Record<string, Phrase>>;

/**
 * Declares a card's translations, keeping every string's literal type so `I18n#t` knows
 * which `{placeholder}` values each key needs.
 *
 * @returns The table it was given.
 */
const defineLocales = <const Table extends LocaleTable>(table: Table): Table => table;

/** The `{name}` placeholders in a phrase, as a union of their names. */
type PlaceholderNames<Written> = Written extends `${string}{${infer Name}}${infer Rest}`
  ? Name | PlaceholderNames<Rest>
  : never;

/** What a phrase has to be given: its placeholders, plus `count` when it has plural forms. */
type PhraseValues<Written> =
  // a wording only known at runtime declares nothing, so it asks for nothing
  string extends Written
    ? never
    : Written extends string
      ? PlaceholderNames<Written>
      : Written extends Record<string, string>
        ? 'count' | PlaceholderNames<Written[keyof Written]>
        : never;

/** The values a key needs, read off its English wording. */
type KeyValues<Table extends LocaleTable, Key extends keyof Table> = PhraseValues<Table[Key]['en']>;

/** `t`'s trailing argument: absent for a key that interpolates nothing. */
type ValuesArg<Table extends LocaleTable, Key extends keyof Table> = [
  KeyValues<Table, Key>,
] extends [never]
  ? []
  : [
      values: {
        [Name in KeyValues<Table, Key>]: Name extends 'count' ? number : string | number;
      },
    ];

/** The values as `t` reads them back, once the generic tuple above has done its checking. */
type ReadValues = Record<string, string | number> | undefined;

/** `{name}` — a placeholder in a phrase. */
const PLACEHOLDER = /\{(?<name>\w+)\}/g;

/**
 * Substitutes a phrase's `{name}` placeholders. Only the phrase is scanned, so a value
 * that itself looks like a placeholder is left alone.
 *
 * @returns The wording as the card draws it.
 */
const interpolate = (phrase: string, key: string, values: ReadValues): string =>
  phrase.replace(PLACEHOLDER, (_placeholder, name: string) => {
    const value = values?.[name];
    if (value === undefined) {
      throw new Error(`'${key}' needs a value for '{${name}}'`);
    }
    return String(value);
  });

const pluralRules = new Map<string, Intl.PluralRules>();

/**
 * The plural rules of the locale that supplied the phrase. Several of the locale names
 * here are not language tags `Intl` knows (`cn`, `kr`, `np`), and resolve to the runtime's
 * own locale — which only matters once such a locale writes plural forms of its own.
 *
 * @returns The rules, built once per locale.
 */
const rulesFor = (locale: string): Intl.PluralRules => {
  const cached = pluralRules.get(locale);
  if (cached) {
    return cached;
  }

  const rules = new Intl.PluralRules(locale);
  pluralRules.set(locale, rules);
  return rules;
};

/**
 * Picks the form a count calls for, by the rules of the locale the phrase came from.
 *
 * @returns The chosen form, or `other` for a category that locale has not written.
 */
const selectPlural = (
  forms: PluralForms,
  locale: string,
  key: string,
  values: ReadValues,
): string => {
  const count = values?.['count'];
  if (typeof count !== 'number') {
    throw new TypeError(`'${key}' has plural forms and needs a numeric 'count'`);
  }
  return forms[rulesFor(locale).select(count)] ?? forms.other;
};

/**
 * Reads a key's wording, falling back to English when the locale has no entry for it.
 *
 * @returns The wording, and the locale it actually came from.
 */
const lookUp = (
  translations: LocaleTable,
  key: string,
  locale: string,
): { phrase: Phrase; locale: string } => {
  const phrases = translations[key];
  if (!phrases) {
    throw new Error(`${key} Translation string not found`);
  }

  const written = phrases[locale];
  if (written !== undefined) {
    return { phrase: written, locale };
  }

  // The english wording the type requires can still be missing at runtime: a card can pass
  // a table it built, and `i18n.test.ts` covers exactly that.
  const english = phrases[FALLBACK_LOCALE];
  // oxlint-disable-next-line typescript/no-unnecessary-condition
  if (english === undefined) {
    throw new Error(`'${key}' translation not found for locale '${locale}'`);
  }
  return { phrase: english, locale: FALLBACK_LOCALE };
};

/**
 * I18n translation class.
 */
class I18n<Translations extends LocaleTable> {
  locale: string;
  translations: Translations;

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
   * Get translation, substituting the `{name}` placeholders its wording declares and
   * falling back to the English string when the locale has no entry for the key.
   *
   * @returns Translated string.
   */
  t<Key extends keyof Translations & string>(
    key: Key,
    ...args: ValuesArg<Translations, Key>
  ): string {
    const values: ReadValues = args[0];
    const { phrase, locale } = lookUp(this.translations, key, this.locale);
    const written = typeof phrase === 'string' ? phrase : selectPlural(phrase, locale, key, values);

    return interpolate(written, key, values);
  }
}

export { defineLocales, I18n, isLocaleAvailable };
export type { LocaleTable, Phrase };
