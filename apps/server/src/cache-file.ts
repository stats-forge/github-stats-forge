/**
 * @file The card cache on disk, so a restart or a deploy does not redraw every card at the cost
 * of a rate-limit point each.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CardCache, HeldCard } from './cache.ts';

const CACHE_FILE = 'cards.json';

/** Bumped when the shape changes, so an older file is ignored rather than misread. */
const CACHE_FILE_VERSION = 1;

/** @returns Whether the value is a card this version wrote. */
const isHeldCard = (value: unknown): value is HeldCard =>
  typeof value === 'object' &&
  value !== null &&
  'key' in value &&
  typeof value.key === 'string' &&
  'content' in value &&
  typeof value.content === 'string' &&
  'storedAt' in value &&
  typeof value.storedAt === 'number' &&
  'expiresAt' in value &&
  typeof value.expiresAt === 'number';

/** @returns The cards a file holds, or none when it is another version or not one at all. */
const parseCacheFile = (text: string): Array<HeldCard> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('version' in parsed) ||
    parsed.version !== CACHE_FILE_VERSION ||
    !('cards' in parsed) ||
    !Array.isArray(parsed.cards)
  ) {
    return [];
  }
  return parsed.cards.filter((card: unknown) => isHeldCard(card));
};

/** @returns The error's code, such as `ENOENT`, when it has one. */
const codeOf = (error: unknown): unknown =>
  typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

/**
 * A missing file is a first start; anything else unreadable is reported and then ignored, since
 * an empty cache only costs redraws.
 *
 * @returns How many cards were taken back.
 */
const loadCache = async (cache: CardCache, dir: string): Promise<number> => {
  try {
    return cache.restore(parseCacheFile(await readFile(join(dir, CACHE_FILE), 'utf8')));
  } catch (error) {
    if (codeOf(error) !== 'ENOENT') {
      process.stderr.write(`Could not read the card cache in ${dir}: ${String(error)}\n`);
    }
    return 0;
  }
};

/**
 * Written beside the file and renamed over it, so a process killed mid-write leaves the last one.
 * A failure is reported rather than thrown: it must not stop a shutdown.
 *
 * @returns How many cards were written.
 */
const saveCache = async (cache: CardCache, dir: string): Promise<number> => {
  const cards = cache.heldCards();
  const target = join(dir, CACHE_FILE);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(`${target}.tmp`, JSON.stringify({ version: CACHE_FILE_VERSION, cards }));
    await rename(`${target}.tmp`, target);
    return cards.length;
  } catch (error) {
    process.stderr.write(`Could not write the card cache to ${dir}: ${String(error)}\n`);
    return 0;
  }
};

export { CACHE_FILE, loadCache, saveCache };
