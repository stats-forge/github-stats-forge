import type { RepositoryAffiliation } from '../graphql/generated/common.ts';

import { OWNER_AFFILIATIONS } from './constants.ts';
import { getEmoji } from './emojiMap.ts';
import { CardError, INVALID_AFFILIATION } from './error.ts';

/**
 * Returns boolean if value is either "true" or "false" else the value as it is.
 *
 * @returns The parsed value.
 */
const parseBoolean = (value: string | boolean | undefined): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }
  return undefined;
};

/**
 * Parse string to array of strings.
 *
 * @returns The array of strings.
 */
const parseArray = (str: string | undefined): Array<string> => {
  if (!str) {
    return [];
  }
  return str.split(',');
};

/**
 * Clamp the given number between the given range.
 *
 * @returns The clamped number.
 */
const clampValue = (number: string | number, min: number, max: number): number => {
  if (Number.isNaN(Number.parseInt(String(number), 10))) {
    return min;
  }
  return Math.max(min, Math.min(Number(number), max));
};

/**
 * Lowercase and trim string.
 *
 * @returns Lowercased and trimmed string.
 */
const lowercaseTrim = (name: string): string => name.toLowerCase().trim();

/**
 * Split array of languages in two columns.
 *
 * @returns Array of languages split in two columns.
 */
const chunkArray = <T>(arr: Array<T>, perChunk: number): Array<Array<T>> => {
  const chunks: Array<Array<T>> = [];
  for (const [index, item] of arr.entries()) {
    const chunkIndex = Math.floor(index / perChunk);
    const chunk = chunks[chunkIndex] ?? [];
    chunk.push(item);
    chunks[chunkIndex] = chunk;
  }
  return chunks;
};

/**
 * Parse emoji from string.
 *
 * @returns String with emoji parsed.
 */
const parseEmojis = (str: string): string => {
  if (!str) {
    throw new Error('[parseEmoji]: str argument not provided');
  }
  // `+` and `-` are part of a shortcode: `:+1:`, `:non-potable_water:`.
  return str.replaceAll(
    /:(?<shortcode>[\w+-]+):/g,
    (_match, shortcode: string) => getEmoji(shortcode) ?? '',
  );
};

const isOwnerAffiliation = (value: string): value is RepositoryAffiliation =>
  OWNER_AFFILIATIONS.some((affiliation) => affiliation === value);

/**
 * Parse owner affiliations.
 *
 * @throws {CardError} If affiliations contains invalid values.
 *
 * @returns Parsed affiliations.
 */
const parseOwnerAffiliations = (affiliations: Array<string>): Array<RepositoryAffiliation> => {
  // `parseArray` returns an empty array for an absent param, so the default lands here.
  const normalized =
    affiliations.length > 0
      ? affiliations.map((affiliation) => affiliation.toUpperCase())
      : ['OWNER'];

  // Check if ownerAffiliations contains valid values.
  if (!normalized.every((value) => isOwnerAffiliation(value))) {
    throw CardError.invalidParam('role', INVALID_AFFILIATION);
  }
  return normalized;
};

const buildSearchFilter = (
  repos: Array<string> | string = [],
  owners: Array<string> | string = [],
): string => {
  const repoFilter =
    Array.isArray(repos) && repos.length > 0 ? repos.map((repo) => `repo:${repo} `).join('') : '';
  const orgFilter =
    Array.isArray(owners) && owners.length > 0
      ? owners.map((owner) => `owner:${owner} `).join('')
      : '';
  return repoFilter + orgFilter;
};

export {
  parseBoolean,
  parseArray,
  clampValue,
  lowercaseTrim,
  chunkArray,
  parseEmojis,
  parseOwnerAffiliations,
  buildSearchFilter,
};
