import fs from 'node:fs';

import { buildLanguageTables, parseLanguages } from './language-tables.ts';

const LANGS_FILEPATH = './src/common/languageColors.json';
const ALIASES_FILEPATH = './src/common/languageAliases.json';

const LANGUAGES_URL =
  'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml';

const response = await fetch(LANGUAGES_URL);
if (!response.ok) {
  throw new Error(`${String(response.status)} ${response.statusText} for ${LANGUAGES_URL}`);
}

const { colors, aliases } = buildLanguageTables(parseLanguages(await response.text()));

// Written the way the formatter would, so a regenerated file passes `format:check` as-is.
fs.writeFileSync(LANGS_FILEPATH, `${JSON.stringify(colors, null, 2)}\n`);
fs.writeFileSync(ALIASES_FILEPATH, `${JSON.stringify(aliases, null, 2)}\n`);
