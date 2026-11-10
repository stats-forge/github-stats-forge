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
  'zh-cn',
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
  'ko',
  'nl',
  'pt-pt',
  'pt-br',
  'ne',
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
  'sv',
  'he',
  'fil',
  'th',
  'sr',
  'sr-latn',
  'no',
  'be',
] as const;

/** A locale a card can draw, as {@link AVAILABLE_LOCALES} spells it. */
type Locale = (typeof AVAILABLE_LOCALES)[number];

const FALLBACK_LOCALE: Locale = 'en';

/** Another code a README may use for a listed locale: an older one, or a shorter one. */
const LOCALE_ALIASES = new Map<string, Locale>([
  ['kr', 'ko'],
  ['cn', 'zh-cn'],
  ['zh', 'zh-cn'],
  ['np', 'ne'],
  ['se', 'sv'],
  ['uk', 'uk-ua'],
]);

/**
 * The tag `Intl` reads a locale by, each listed code being one it knows.
 *
 * @returns The tag, English's when no locale was asked for.
 */
const intlTag = (locale: Locale | undefined): string => locale ?? FALLBACK_LOCALE;

/**
 * The listed locale a requested code draws, matched in any case.
 *
 * @returns The code as {@link AVAILABLE_LOCALES} spells it, or `undefined` for one it lacks.
 */
const resolveLocale = (locale: string): Locale | undefined => {
  const lower = locale.toLowerCase();
  return AVAILABLE_LOCALES.find((listed) => listed === lower) ?? LOCALE_ALIASES.get(lower);
};

/**
 * A count-dependent wording: one form per plural category the locale distinguishes.
 *
 * `other` is the form every locale has, so it is what an unwritten category falls back to.
 */
type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/** One locale's wording for a key, either outright or a form per plural category. */
type Phrase = string | PluralForms;

/** One locale's wordings, by key. */
type Wordings = Record<string, Phrase>;

/**
 * A card's translations: a locale, then that locale's wording per key.
 *
 * `en` is required and declares every key, because it is what every other locale falls back to.
 */
type LocaleTable = { en: Wordings } & Partial<Record<Locale, Wordings>>;

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

/** Plural categories `Intl.PluralRules` never picks, so a form written under one is never drawn. */
type UnknownCategories<Written> =
  Written extends Record<string, string> ? Exclude<keyof Written, Intl.LDMLPluralRule> : never;

/**
 * A translation, or `never` when it needs a value the English wording does not supply or
 * writes a plural form under a category no locale has.
 */
type Translation<English, Written> = [
  Exclude<PhraseValues<Written>, PhraseValues<English>> | UnknownCategories<Written>,
] extends [never]
  ? Written
  : never;

/**
 * A table as it may be written: listed locales only, which an alias or a typo is not, each
 * naming only keys `en` declares and only the values its English wording supplies.
 */
type Checked<Table extends LocaleTable> = {
  [Code in keyof Table]: Code extends Locale
    ? {
        [Key in keyof Table[Code]]: Key extends keyof Table['en']
          ? Translation<Table['en'][Key], Table[Code][Key]>
          : never;
      }
    : never;
};

/**
 * Declares a card's translations, keeping every string's literal type so `localize` knows
 * which `{placeholder}` values each key needs, and so a translation is checked against them.
 *
 * @returns The table it was given.
 */
const defineLocales = <const Table extends LocaleTable>(table: Table & Checked<Table>): Table =>
  table;

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
  phrase.replaceAll(PLACEHOLDER, (_placeholder, name: string) => {
    const value = values?.[name];
    if (value === undefined) {
      throw new Error(`'${key}' needs a value for '{${name}}'`);
    }
    return String(value);
  });

const pluralRules = new Map<Locale, Intl.PluralRules>();

/**
 * The plural rules of the locale that supplied the phrase.
 *
 * @returns The rules, built once per locale.
 */
const rulesFor = (locale: Locale): Intl.PluralRules => {
  const cached = pluralRules.get(locale);
  if (cached) {
    return cached;
  }

  const rules = new Intl.PluralRules(intlTag(locale));
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
  locale: Locale,
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
 * Draws a wording in the plural form its count calls for, by the rules of the locale it came
 * from, with its `{name}` placeholders substituted.
 *
 * @returns The wording as the card draws it.
 */
const draw = (phrase: Phrase, from: Locale, key: string, values: ReadValues): string => {
  const wording = typeof phrase === 'string' ? phrase : selectPlural(phrase, from, key, values);

  return interpolate(wording, key, values);
};

/**
 * A card's translations bound to one locale: each key a function of the values its own
 * wording declares.
 */
type Localized<Table extends LocaleTable> = {
  [Key in keyof Table['en']]: (...args: ValuesArg<Table['en'][Key]>) => string;
};

/**
 * Binds a card's translations to one locale, so a card names a wording where it draws it
 * — `t.title({ login })` — rather than naming a key. That is what lets an editor follow a
 * wording to where it is written, and why a key carries no card name in front of it.
 * A key the locale lacks draws in English.
 *
 * @returns One function per key the table declares.
 */
const localize = <Table extends LocaleTable>(table: Table, locale?: Locale): Localized<Table> => {
  const asked = locale ?? FALLBACK_LOCALE;
  const wordings: Record<string, (values?: ReadValues) => string> = {};

  for (const [key, english] of Object.entries(table.en)) {
    const written = table[asked]?.[key];
    // a fallback is English, so English rules pick its plural form
    const from = written === undefined ? FALLBACK_LOCALE : asked;
    const phrase = written ?? english;
    wordings[key] = (values): string => draw(phrase, from, key, values);
  }

  // A mapped type over a table known only as a type parameter needs the assertion.
  return wordings as Localized<Table>;
};

export { AVAILABLE_LOCALES, defineLocales, intlTag, LOCALE_ALIASES, localize, resolveLocale };
export type { Locale, LocaleTable, Localized };
