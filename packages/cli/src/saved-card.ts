import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { CardKind } from './cards.js';
import { findCard } from './cards.js';
import type { Answer } from './query.js';

/**
 * @file A card, written down.
 *
 * The file holds what a query string would hold — the card and its options as
 * strings — so it reads like the URL it stands for, and can be edited by hand.
 */

/** A card and the answers it was rendered from: the shape of the file. */
interface SavedCard {
  /** Which card: `stats`, `top-langs`, `pin`, `gist`, `wakatime`. */
  card: string;
  /** The options, exactly as they reach the endpoint. */
  options: Record<string, string>;
}

/**
 * @param path File to look for, relative to the working directory.
 * @returns Whether there is something there to load.
 */
export const savedCardExists = (path: string): boolean => existsSync(resolve(process.cwd(), path));

/**
 * Reads a card back off disk.
 *
 * @param path File to read, relative to the working directory.
 * @returns The card it names, and its options.
 * @throws {Error} When the file is not a card this version can render.
 */
export const readSavedCard = async (
  path: string,
): Promise<{ card: CardKind; options: Record<string, string> }> => {
  const file = resolve(process.cwd(), path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`${file} is not readable as JSON`, { cause: err });
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`${file} does not hold a saved card`);
  }

  const { card: id, options } = parsed as Partial<SavedCard>;
  const card = typeof id === 'string' ? findCard(id) : undefined;
  if (!card) {
    throw new Error(`${file} names no card this version renders: ${id ?? '(nothing)'}`);
  }

  // An option that is not a string could not have come off a query string.
  const entries = Object.entries(options ?? {}).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );

  return { card, options: Object.fromEntries(entries) };
};

/**
 * Writes a card down, so the same one can be rendered again later.
 *
 * @param path File to write, relative to the working directory.
 * @param card The card being rendered.
 * @param options Its options, as they reach the endpoint.
 * @returns The path written to.
 */
export const writeSavedCard = async (
  path: string,
  card: CardKind,
  options: Record<string, string>,
): Promise<string> => {
  const file = resolve(process.cwd(), path);
  const saved: SavedCard = { card: card.id, options };
  await writeFile(file, `${JSON.stringify(saved, null, 2)}\n`, 'utf8');
  return file;
};

/**
 * Turns saved options back into answers the menu can show and edit.
 *
 * Everything on a query string is a string;
 * a boolean option becomes one again so its prompt opens on the right answer.
 *
 * @param card The card the options belong to.
 * @param options The saved options.
 * @returns The answers, ready for the menu.
 */
export const toAnswers = (card: CardKind, options: Record<string, string>): Map<string, Answer> => {
  const kinds = new Map(
    [...card.required, ...card.options].map((option) => [option.name, option.kind]),
  );

  return new Map(
    Object.entries(options).map(([name, value]) => [
      name,
      kinds.get(name) === 'boolean' ? value === 'true' : value,
    ]),
  );
};
