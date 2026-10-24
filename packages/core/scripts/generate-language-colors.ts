import fs from 'node:fs';

import * as jsYaml from 'js-yaml';

const LANGS_FILEPATH = './src/common/languageColors.json';
const ALIASES_FILEPATH = './src/common/languageAliases.json';

/** GitHub's language bar shows only these; any other language is one it leaves out. */
const COUNTED_TYPES = new Set(['programming', 'markup']);

interface LinguistLanguage {
  type?: string;
  color?: string;
  aliases?: Array<string>;
  interpreters?: Array<string>;
}

// Retrieve languages from GitHub linguist repository yaml file
const response = await fetch(
  'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml',
);

// and convert them to a JS Object
const languages = jsYaml.load(await response.text()) as Record<string, LinguistLanguage>;

const languageColors: Record<string, string | undefined> = {};

// Filter only language colors from the whole file
for (const [lang, entry] of Object.entries(languages)) {
  languageColors[lang] = entry.color;
}

// The lookup is case-insensitive, so two spellings of one name would shadow each other.
const seen = new Map<string, string>();
for (const [lang, color] of Object.entries(languageColors)) {
  if (color === undefined) {
    continue;
  }

  const lower = lang.toLowerCase();
  const previous = seen.get(lower);
  if (previous !== undefined) {
    throw new Error(`Case-insensitive duplicate language: "${previous}" vs "${lang}"`);
  }
  seen.set(lower, lang);
}

// Each name, alias and interpreter, lower-case, to the name, or `null` for a language GitHub's bar
// leaves out. A `Map`, so a key such as `constructor` is never read off `Object.prototype`.
const aliases = new Map<string, string | null>();
const countedName = (lang: string): string | null =>
  COUNTED_TYPES.has(languages[lang]?.type ?? '') ? lang : null;

for (const [lang, entry] of Object.entries(languages)) {
  for (const key of [lang, ...(entry.aliases ?? [])]) {
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

// Written the way the formatter would, so a regenerated file passes `format:check` as-is.
fs.writeFileSync(LANGS_FILEPATH, `${JSON.stringify(languageColors, null, 2)}\n`);
fs.writeFileSync(
  ALIASES_FILEPATH,
  `${JSON.stringify(Object.fromEntries([...aliases].toSorted(([a], [b]) => a.localeCompare(b))), null, 2)}\n`,
);
