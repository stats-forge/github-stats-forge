import fs from 'node:fs';

import * as jsYaml from 'js-yaml';

import { buildLanguageTables } from './language-tables.ts';
import type { LinguistLanguage } from './language-tables.ts';

const LANGS_FILEPATH = './src/common/languageColors.json';
const ALIASES_FILEPATH = './src/common/languageAliases.json';

const response = await fetch(
  'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml',
);
const languages = jsYaml.load(await response.text()) as Record<string, LinguistLanguage>;

const { colors, aliases } = buildLanguageTables(languages);

// Written the way the formatter would, so a regenerated file passes `format:check` as-is.
fs.writeFileSync(LANGS_FILEPATH, `${JSON.stringify(colors, null, 2)}\n`);
fs.writeFileSync(ALIASES_FILEPATH, `${JSON.stringify(aliases, null, 2)}\n`);
