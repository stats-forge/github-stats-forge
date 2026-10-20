/**
 * @file Looks a language up by any name Linguist knows it by, from the table
 * `scripts/generate-language-colors.ts` generates.
 */

import languageAliasesJson from './languageAliases.json' with { type: 'json' };

// a `Map`, so a name such as `constructor` misses rather than finding `Object.prototype`
const languageAliases = new Map<string, string | null>(Object.entries(languageAliasesJson));

/**
 * Resolves a Linguist language name, alias or interpreter, ignoring case.
 *
 * @returns The Linguist name; `null` for a language GitHub's language bar leaves out, such as
 * SQL or Markdown; `undefined` for one Linguist does not know.
 */
const linguistLanguage = (name: string): string | null | undefined =>
  languageAliases.get(name.trim().toLowerCase());

export { linguistLanguage };
