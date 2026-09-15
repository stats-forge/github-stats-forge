/**
 * @file A card, written down.
 *
 * The file holds what a query string would hold — the card and its options as
 * strings — so it reads like the URL it stands for, and can be edited by hand.
 * `card` names which one and discriminates the options beside it, and `version` says which
 * shape of this file it is.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { CardKind } from '@stats-forge/github-stats-forge-catalog';
import { CARD_FILE_VERSION, findCard } from '@stats-forge/github-stats-forge-catalog';

import type { Answer } from './query.ts';

/** Envelope keys, so a card's own options can never be named these. */
const RESERVED: ReadonlySet<string> = new Set(['version', 'card']);

/** A card and the answers it was rendered from: the shape of the file. */
interface SavedCard extends Record<string, string | number> {
  /** Which shape of this file it is; see {@link CARD_FILE_VERSION}. */
  version: number;
  /** Which card, by the id the catalog gives it. */
  card: string;
}

/**
 * @returns Whether there is something there to load.
 */
export const savedCardExists = (path: string): boolean => existsSync(resolve(process.cwd(), path));

/**
 * Reads a card back off disk.
 *
 * An option that is not a string is dropped, because it could not have come off
 * a query string.
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

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${file} does not hold a saved card`);
  }

  const record = parsed as Record<string, unknown>;

  // Absent is the first version, there having been no format before it. `null` is not absent.
  const version: unknown = record['version'] === undefined ? CARD_FILE_VERSION : record['version'];

  // Told apart from the next check because updating the CLI cannot fix a malformed version.
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error(
      `${file} has a version that is not a whole number from 1: ${JSON.stringify(version)}`,
    );
  }

  /*
   * A higher version is a file this build cannot be sure it understands, so it says so
   * rather than rendering a card from options it may have read wrong.
   */
  if (version > CARD_FILE_VERSION) {
    throw new Error(
      `${file} is version ${String(version)}, and this build reads up to ${String(CARD_FILE_VERSION)}. Update the CLI.`,
    );
  }

  const entries = Object.entries(record);
  const id = record['card'];
  const card = typeof id === 'string' ? findCard(id) : undefined;
  if (!card) {
    throw new Error(
      `${file} names no card this version renders: ${typeof id === 'string' ? id : '(nothing)'}`,
    );
  }

  const options = Object.fromEntries(
    entries.filter(
      (entry): entry is [string, string] => !RESERVED.has(entry[0]) && typeof entry[1] === 'string',
    ),
  );

  return { card, options };
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
  const saved: SavedCard = { version: CARD_FILE_VERSION, card: card.id, ...options };
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
