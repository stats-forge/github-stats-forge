/**
 * @file The map `generate-emoji-map.ts` writes, worked out from emojibase's tables with no network
 * or disk, so it can be tested.
 */

import * as z from 'zod/mini';

/** The npm registry's `latest` document for emojibase-data, as far as this reads it. */
const registryLatest = z.object({ version: z.string() });

/** GitHub's shortcode preset, keyed by hexcode. */
const githubShortcodes = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

/** The hexcode -> unicode table, one entry per emoji; the fields this does not read are dropped. */
const compactTable = z.array(z.object({ hexcode: z.string(), unicode: z.string() }));

type Shortcodes = z.infer<typeof githubShortcodes>;
type Compact = z.infer<typeof compactTable>;

/** Well under GitHub's set: fewer means the source changed shape. */
const MIN_SHORTCODES = 1500;

/**
 * Check a download against its schema, so a reshaped one fails naming the field rather than
 * somewhere inside {@link buildEmojiMap}.
 *
 * @throws {Error} When the value does not match.
 *
 * @returns The value, typed.
 */
const parseAs = <T>(schema: z.ZodMiniType<T>, value: unknown, what: string): T => {
  const result = z.safeParse(schema, value);
  if (!result.success) {
    throw new Error(`${what} is not shaped as expected:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
};

/** @returns The latest version's number. */
const parseLatest = (value: unknown): string =>
  parseAs(registryLatest, value, 'emojibase-data/latest').version;

/** @returns The shortcodes, checked. */
const parseShortcodes = (value: unknown): Shortcodes =>
  parseAs(githubShortcodes, value, 'shortcodes/github.json');

/** @returns The compact table, checked. */
const parseCompact = (value: unknown): Compact => parseAs(compactTable, value, 'compact.json');

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

export { buildEmojiMap, MIN_SHORTCODES, parseCompact, parseLatest, parseShortcodes };
export type { Compact, Shortcodes };
