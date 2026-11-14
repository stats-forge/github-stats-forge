#!/usr/bin/env node
/**
 * @file Fails when a card's page and the catalog disagree on the options the card takes.
 *
 * The tables are written by hand for their prose, so nothing else notices one falling behind.
 *
 * @returns Nothing; the process exits non-zero naming each option out of step.
 */

import { readFileSync } from 'node:fs';

import { cards } from '@stats-forge/github-stats-forge-catalog';

import { CARDS } from '../src/anvil/cards.ts';

const PAGES = new URL('../src/content/docs/docs/', import.meta.url);
const COMMON_PAGE = 'customization/common-options.md';

/** @returns The backticked names in `text`, such as both of `` `from` / `to` ``, or one given a value. */
const namesIn = (text: string): Array<string> =>
  [...text.matchAll(/`(?<name>[a-z_]+)(?:=[^`]*)?`/g)].flatMap(
    (match) => match.groups?.['name'] ?? [],
  );

/** @returns The names in the first column of each table whose first header reads `Option`. */
const optionTableNames = (page: string): Set<string> => {
  const names = new Set<string>();
  let inOptionTable = false;
  let header = true;
  for (const line of page.split('\n')) {
    if (!line.startsWith('|')) {
      header = true;
      inOptionTable = false;
      continue;
    }
    const firstCell = line.split('|')[1]?.trim() ?? '';
    if (header) {
      inOptionTable = firstCell === 'Option';
      header = false;
      continue;
    }
    if (inOptionTable) {
      for (const name of namesIn(firstCell)) {
        names.add(name);
      }
    }
  }
  return names;
};

const read = (path: string): string => readFileSync(new URL(path, PAGES), 'utf8');

const common = read(COMMON_PAGE);
const commonNames = new Set(namesIn(common));
const failures: Array<string> = [];

for (const card of cards) {
  const docs = CARDS.find((extra) => extra.id === card.id)?.docs;
  if (docs === undefined) {
    failures.push(`${card.id}: the anvil names no page for it`);
    continue;
  }
  const path = `cards/${docs}.md`;
  const documented = optionTableNames(read(path));
  const taken = new Set([...card.required, ...card.options].map((option) => option.name));

  for (const name of taken) {
    if (!documented.has(name) && !commonNames.has(name)) {
      failures.push(`${path}: \`${name}\` is not in an Option table, nor on ${COMMON_PAGE}`);
    }
  }
  for (const name of documented) {
    if (!taken.has(name)) {
      failures.push(
        `${path}: \`${name}\` is in an Option table, but the ${card.id} card takes no such option`,
      );
    }
  }
}

const takenByAny = new Set(cards.flatMap((card) => card.options.map((option) => option.name)));
for (const name of optionTableNames(common)) {
  if (!takenByAny.has(name)) {
    failures.push(`${COMMON_PAGE}: \`${name}\` is in an Option table, but no card takes it`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stderr.write(`  ✓ every option of ${String(cards.length)} cards is documented\n`);
}
