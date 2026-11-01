import { describe, expect, it } from 'vitest';

import { buildEmojiMap, MIN_SHORTCODES } from '../scripts/emoji-map.ts';
import type { EmojibaseTables } from '../scripts/emoji-map.ts';

/** @returns `count` filler emoji, enough to clear the size guard. */
const filler = (count: number): EmojibaseTables => {
  const hexcodes = Array.from({ length: count }, (_, i) => `F${String(i)}`);
  return {
    shortcodes: Object.fromEntries(hexcodes.map((hexcode) => [hexcode, `filler_${hexcode}`])),
    compact: hexcodes.map((hexcode) => ({ hexcode, unicode: '·' })),
  };
};

describe(buildEmojiMap, () => {
  it('maps every shortcode of an emoji, skipping one the compact table lacks', () => {
    const { shortcodes, compact } = filler(MIN_SHORTCODES);

    const map = buildEmojiMap({
      shortcodes: { ...shortcodes, '1F600': 'grinning', '1F44D': ['+1', 'thumbsup'], DEAD: 'gone' },
      compact: [
        ...compact,
        { hexcode: '1F600', unicode: '😀' },
        { hexcode: '1F44D', unicode: '👍' },
      ],
    });

    expect(map).toMatchObject({ grinning: '😀', '+1': '👍', thumbsup: '👍' });
    expect(map).not.toHaveProperty('gone');
  });

  it('refuses a set that shrank, which means the source changed shape', () => {
    expect(() => buildEmojiMap(filler(MIN_SHORTCODES - 1))).toThrow(
      `Only ${String(MIN_SHORTCODES - 1)} shortcodes resolved; refusing to write.`,
    );
  });

  it.each<[string, Partial<Record<keyof EmojibaseTables, unknown>>]>([
    ['a shortcode that is a number', { shortcodes: { '1F600': 1 } }],
    ['an emoji without its unicode', { compact: [{ hexcode: '1F600' }] }],
    ['an error page in place of a table', { compact: { error: 'Not found' } }],
  ])('refuses %s', (_, reshaped) => {
    expect(() => buildEmojiMap({ ...filler(MIN_SHORTCODES), ...reshaped })).toThrow(
      "emojibase's tables are not shaped as expected:",
    );
  });
});
