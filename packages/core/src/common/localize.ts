/**
 * Every locale a card can be asked for.
 *
 * A key is written in `en` first and translated afterwards, so a card's table need not
 * carry every locale — a wording falls back to `en`. This list is what the api accepts.
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
 * Declares a card's translations, keeping every string's literal type so `localize` knows
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

/** `t`'s trailing argument: absent for a wording that interpolates nothing. */
type ValuesArg<Written> = [PhraseValues<Written>] extends [never]
  ? []
  : [
      values: {
        [Name in PhraseValues<Written>]: Name extends 'count' ? number : string | number;
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
 * Reads a wording in the locale asked for, falling back to English when that locale has
 * no entry for it.
 *
 * @returns The wording, and the locale it actually came from.
 */
const readPhrase = (
  phrases: LocaleTable[string],
  key: string,
  locale: string,
): { phrase: Phrase; locale: string } => {
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
 * Draws a key's wording: the locale's own if it has one and English otherwise, in the
 * plural form its count calls for, with its `{name}` placeholders substituted.
 *
 * @returns The wording as the card draws it.
 */
const draw = (
  phrases: LocaleTable[string],
  key: string,
  locale: string,
  values: ReadValues,
): string => {
  const { phrase, locale: from } = readPhrase(phrases, key, locale);
  const wording = typeof phrase === 'string' ? phrase : selectPlural(phrase, from, key, values);

  return interpolate(wording, key, values);
};

/**
 * A card's translations bound to one locale: each key a function of the values its own
 * wording declares.
 */
type Localized<Table extends LocaleTable> = {
  [Key in keyof Table]: (...args: ValuesArg<Table[Key]['en']>) => string;
};

/**
 * Binds a card's translations to one locale, so a card names a wording where it draws it
 * — `t.title({ login })` — rather than naming a key. That is what lets an editor follow a
 * wording to where it is written, and why a key carries no card name in front of it.
 *
 * @returns One function per key the table declares.
 */
const localize = <Table extends LocaleTable>(table: Table, locale?: string): Localized<Table> => {
  const asked = locale || FALLBACK_LOCALE;
  const wordings: Record<string, (values?: ReadValues) => string> = {};

  for (const [key, phrases] of Object.entries(table)) {
    wordings[key] = (values): string => draw(phrases, key, asked, values);
  }

  // A mapped type over a table known only as a type parameter needs the assertion.
  return wordings as Localized<Table>;
};

export { defineLocales, isLocaleAvailable, localize };
export type { LocaleTable, Localized, Phrase };
