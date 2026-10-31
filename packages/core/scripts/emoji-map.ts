/**
 * @file The map `generate-emoji-map.ts` writes, worked out from emojibase's tables with no network
 * or disk, so it can be tested.
 */

/** GitHub's shortcode preset, keyed by hexcode. */
type Shortcodes = Record<string, string | Array<string>>;

/** The hexcode -> unicode table, one entry per emoji. */
type Compact = Array<{ hexcode: string; unicode: string }>;

/** Well under GitHub's set: fewer means the source changed shape. */
const MIN_SHORTCODES = 1500;

/**
 * @throws {Error} When fewer than {@link MIN_SHORTCODES} shortcodes resolve.
 *
 * @returns Each shortcode to its emoji, skipping a hexcode the compact table lacks.
 */
const buildEmojiMap = (shortcodes: Shortcodes, compact: Compact): Record<string, string> => {
  const unicodeByHexcode = new Map(compact.map((emoji) => [emoji.hexcode, emoji.unicode]));

  const emojiMap: Record<string, string> = {};
  for (const [hexcode, names] of Object.entries(shortcodes)) {
    const unicode = unicodeByHexcode.get(hexcode);
    if (unicode === undefined) {
      continue;
    }
    for (const name of Array.isArray(names) ? names : [names]) {
      emojiMap[name] = unicode;
    }
  }

  const total = Object.keys(emojiMap).length;
  if (total < MIN_SHORTCODES) {
    throw new Error(`Only ${String(total)} shortcodes resolved; refusing to write.`);
  }
  return emojiMap;
};

export { buildEmojiMap, MIN_SHORTCODES };
export type { Compact, Shortcodes };
