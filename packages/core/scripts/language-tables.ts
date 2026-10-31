/**
 * @file The tables `generate-language-colors.ts` writes, worked out from linguist's languages with
 * no network or disk, so they can be tested.
 */

/** GitHub's language bar shows only these; any other language is one it leaves out. */
const COUNTED_TYPES = new Set(['programming', 'markup']);

interface LinguistLanguage {
  type?: string;
  color?: string;
  aliases?: Array<string>;
  interpreters?: Array<string>;
}

interface LanguageTables {
  /** Each language to its color, `undefined` for one linguist gives none. */
  colors: Record<string, string | undefined>;
  /** Each name, alias and interpreter, lower-case, to the name; `null` for one the bar leaves out. */
  aliases: Record<string, string | null>;
}

/**
 * @throws {Error} When two names, or a name and an alias, collide case-insensitively.
 *
 * @returns Both tables, the aliases sorted by key.
 */
const buildLanguageTables = (languages: Record<string, LinguistLanguage>): LanguageTables => {
  const colors: Record<string, string | undefined> = {};
  for (const [lang, entry] of Object.entries(languages)) {
    colors[lang] = entry.color;
  }

  // A `Map`, so a key such as `constructor` is never read off `Object.prototype`.
  const aliases = new Map<string, string | null>();
  const countedName = (lang: string): string | null =>
    COUNTED_TYPES.has(languages[lang]?.type ?? '') ? lang : null;

  for (const [lang, entry] of Object.entries(languages)) {
    for (const key of [lang, ...(entry.aliases ?? [])]) {
      // the lookup is case-insensitive, so two spellings of one key would shadow each other
      const lower = key.toLowerCase();
      if (aliases.has(lower)) {
        throw new Error(`Name or alias "${key}" is claimed twice, the second time by "${lang}"`);
      }
      aliases.set(lower, countedName(lang));
    }
  }

  // An interpreter names a language only where no name or alias does, and only one language claims it.
  const claims = new Map<string, Array<string>>();
  for (const [lang, entry] of Object.entries(languages)) {
    for (const interpreter of entry.interpreters ?? []) {
      const lower = interpreter.toLowerCase();
      claims.set(lower, [...(claims.get(lower) ?? []), lang]);
    }
  }
  for (const [interpreter, langs] of claims) {
    const [lang] = langs;
    if (!aliases.has(interpreter) && langs.length === 1 && lang !== undefined) {
      aliases.set(interpreter, countedName(lang));
    }
  }

  return {
    colors,
    aliases: Object.fromEntries([...aliases].toSorted(([a], [b]) => a.localeCompare(b))),
  };
};

export { buildLanguageTables };
export type { LinguistLanguage };
