import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { CardKind } from './cards.ts';
import { findCard } from './cards.ts';
import type { Answer } from './query.ts';

/**
 * @file A card, written down.
 *
 * The file holds what a query string would hold — the card and its options as
 * strings — so it reads like the URL it stands for, and can be edited by hand.
 */

/** A card and the answers it was rendered from: the shape of the file. */
interface SavedCard {
  /** Which card, by the id the catalog gives it. */
  card: string;
  /** The options, exactly as they reach the endpoint. */
  options: Record<string, string>;
}

/**
 * @returns Whether there is something there to load.
 */
export const savedCardExists = (path: string): boolean => existsSync(resolve(process.cwd(), path));

/**
 * Reads a card back off disk.
 *
 * @throws {Error} When the file is not a card this version can render.
 *
 * @returns The card it names, and its options.
 */
export const readSavedCard = async (
  path: string,
): Promise<{ card: CardKind; options: Record<string, string> }> => {
  const file = resolve(process.cwd(), path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`${file} is not readable as JSON`, { cause: error });
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
 * a boolean becomes one again, and a list splits back into its values,
 * so each prompt opens on the answer it was saved with.
 *
 * @returns The answers, ready for the menu.
 */
export const toAnswers = (card: CardKind, options: Record<string, string>): Map<string, Answer> => {
  const kinds = new Map(
    [...card.required, ...card.options].map((option) => [option.name, option.kind]),
  );

  const toAnswer = (name: string, value: string): Answer => {
    switch (kinds.get(name)) {
      case 'boolean': {
        return value === 'true';
      }
      case 'list': {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      default: {
        return value;
      }
    }
  };

  return new Map(Object.entries(options).map(([name, value]) => [name, toAnswer(name, value)]));
};
