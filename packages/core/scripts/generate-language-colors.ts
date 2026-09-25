import fs from 'node:fs';

import * as jsYaml from 'js-yaml';

const LANGS_FILEPATH = './src/common/languageColors.json';

// Retrieve languages from GitHub linguist repository yaml file
const response = await fetch(
  'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml',
);

// and convert them to a JS Object
const languages = jsYaml.load(await response.text()) as Record<string, { color?: string }>;

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

// Written the way the formatter would, so a regenerated file passes `format:check` as-is.
fs.writeFileSync(LANGS_FILEPATH, `${JSON.stringify(languageColors, null, 2)}\n`);
