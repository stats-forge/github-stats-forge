import { getEmoji } from './emojiMap.ts';

/**
 * Whether a repository was excluded by the query or by the deployment.
 *
 * An entry matches either the full `owner/name` or the bare `name`, ignoring case as GitHub does,
 * so every card taking `exclude_repo` reads it, and a host's `EXCLUDE_REPO`, the same way.
 *
 * @returns The test, over lowercased entries.
 */
const excludes = (entries: Array<string>): ((nameWithOwner: string) => boolean) => {
  const excluded = new Set(entries.map((entry) => entry.toLowerCase()));
  return (nameWithOwner) => {
    const lowered = nameWithOwner.toLowerCase();
    return excluded.has(lowered) || excluded.has(lowered.slice(lowered.indexOf('/') + 1));
  };
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

/**
 * The search qualifiers a scope reads as: `owner/*` is an owner, anything else a repository.
 *
 * @returns The qualifiers, each followed by a space, ready to prefix a query.
 */
const buildSearchFilter = (scope: ReadonlyArray<string>): string =>
  scope
    .map((entry) => (entry.endsWith('/*') ? `owner:${entry.slice(0, -2)} ` : `repo:${entry} `))
    .join('');

export { buildSearchFilter, chunkArray, excludes, lowercaseTrim, parseEmojis };
