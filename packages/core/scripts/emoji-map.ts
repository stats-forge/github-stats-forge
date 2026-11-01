/**
 * @file The map `generate-emoji-map.ts` writes, worked out from emojibase's tables with no network
 * or disk, so it can be tested.
 */

import * as z from 'zod/mini';

/** GitHub's shortcode preset keyed by hexcode, and the hexcode -> unicode table. */
const emojibaseTables = z.object({
  shortcodes: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  compact: z.array(z.object({ hexcode: z.string(), unicode: z.string() })),
});

type EmojibaseTables = z.infer<typeof emojibaseTables>;

/** Well under GitHub's set: fewer means the source changed shape. */
const MIN_SHORTCODES = 1500;

/**
 * @throws {Error} When a table is not shaped as expected, or fewer than {@link MIN_SHORTCODES}
 * shortcodes resolve.
 *
 * @returns Each shortcode to its emoji, skipping a hexcode the compact table lacks.
 */
const buildEmojiMap = (tables: unknown): Record<string, string> => {
  const result = z.safeParse(emojibaseTables, tables);
  if (!result.success) {
    throw new Error(
      `emojibase's tables are not shaped as expected:\n${z.prettifyError(result.error)}`,
    );
  }
  const { shortcodes, compact } = result.data;
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
export type { EmojibaseTables };
