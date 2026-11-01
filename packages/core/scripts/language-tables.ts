/**
 * @file The tables `generate-language-colors.ts` writes, worked out from linguist's languages with
 * no network or disk, so they can be tested.
 */

import * as jsYaml from 'js-yaml';
import * as z from 'zod/mini';

/** GitHub's language bar shows only these; any other language is one it leaves out. */
const COUNTED_TYPES = new Set(['programming', 'markup']);

/** The part of each `languages.yml` entry the tables read; the rest is dropped. */
const linguistLanguage = z.object({
  type: z.optional(z.string()),
  color: z.optional(z.string()),
  aliases: z.optional(z.array(z.string())),
  interpreters: z.optional(z.array(z.string())),
});

const linguistLanguages = z.record(z.string(), linguistLanguage);

/** Each language name to its entry. */
type LinguistLanguages = z.infer<typeof linguistLanguages>;

interface LanguageTables {
  /** Each language to its color, `undefined` for one linguist gives none. */
  colors: Record<string, string | undefined>;
  /** Each name, alias and interpreter, lower-case, to the name; `null` for one the bar leaves out. */
  aliases: Record<string, string | null>;
}

/**
 * Read linguist's `languages.yml`, refusing a file it has reshaped, or a body that is not the file
 * at all (`404: Not Found` is valid YAML), rather than writing a wrong table from it.
 *
 * @throws {Error} When the YAML is malformed, or an entry is not shaped like a language.
 *
 * @returns Each language name to its entry.
 */
const parseLanguages = (yaml: string): LinguistLanguages => {
  const result = z.safeParse(linguistLanguages, jsYaml.load(yaml));
  if (!result.success) {
    throw new Error(`languages.yml is not a table of languages:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
};

/**
 * @throws {Error} When two names, or a name and an alias, collide case-insensitively.
 *
 * @returns Both tables, the aliases sorted by key.
 */
const buildLanguageTables = (languages: LinguistLanguages): LanguageTables => {
  const colors = Object.fromEntries(
    Object.entries(languages).map(([lang, { color }]) => [lang, color]),
  );

  // A `Map`, so a key such as `constructor` is never read off `Object.prototype`.
  const aliases = new Map<string, string | null>();
  const countedName = (lang: string): string | null =>
    COUNTED_TYPES.has(languages[lang]?.type ?? '') ? lang : null;

  // An interpreter names a language only where no name or alias does, and only one language claims it.
  const claims = new Map<string, string | null>();

  for (const [lang, entry] of Object.entries(languages)) {
    for (const key of [lang, ...(entry.aliases ?? [])]) {
      // the lookup is case-insensitive, so two spellings of one key would shadow each other
      const lower = key.toLowerCase();
      if (aliases.has(lower)) {
        throw new Error(`Name or alias "${key}" is claimed twice, the second time by "${lang}"`);
      }
      aliases.set(lower, countedName(lang));
    }
    for (const interpreter of entry.interpreters ?? []) {
      const lower = interpreter.toLowerCase();
      claims.set(lower, claims.has(lower) ? null : lang);
    }
  }

  for (const [interpreter, lang] of claims) {
    if (lang !== null && !aliases.has(interpreter)) {
      aliases.set(interpreter, countedName(lang));
    }
  }

  return {
    colors,
    aliases: Object.fromEntries([...aliases].toSorted(([a], [b]) => a.localeCompare(b))),
  };
};

export { buildLanguageTables, parseLanguages };
export type { LinguistLanguages };
