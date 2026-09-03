import fs from 'node:fs';

import * as jsYaml from 'js-yaml';

const LANGS_FILEPATH = './src/common/languageColors.json';

// Retrieve languages from github linguist repository yaml file
const response = await fetch(
  'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml',
);

// and convert them to a JS Object
const languages = jsYaml.load(await response.text());

const languageColors = {};

// Filter only language colors from the whole file
for (const lang of Object.keys(languages)) {
  languageColors[lang] = languages[lang].color;
}

// Debug Print
// console.dir(languageColors);
// Written the way the formatter would, so a regenerated file passes `format:check` as-is.
fs.writeFileSync(LANGS_FILEPATH, `${JSON.stringify(languageColors, null, 2)}\n`);
