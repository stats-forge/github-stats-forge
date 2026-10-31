import { describe, expect, it } from 'vitest';

import { buildEmojiMap, MIN_SHORTCODES } from '../scripts/emoji-map.ts';
import type { Compact, Shortcodes } from '../scripts/emoji-map.ts';

/** @returns `count` filler emoji, enough to clear the size guard. */
const filler = (count: number): { shortcodes: Shortcodes; compact: Compact } => {
  const hexcodes = Array.from({ length: count }, (_, i) => `F${String(i)}`);
  return {
    shortcodes: Object.fromEntries(hexcodes.map((hexcode) => [hexcode, `filler_${hexcode}`])),
    compact: hexcodes.map((hexcode) => ({ hexcode, unicode: '·' })),
  };
};

describe(buildEmojiMap, () => {
  it('maps every shortcode of an emoji, skipping one the compact table lacks', () => {
    const { shortcodes, compact } = filler(MIN_SHORTCODES);

    const map = buildEmojiMap(
      { ...shortcodes, '1F600': 'grinning', '1F44D': ['+1', 'thumbsup'], DEAD: 'gone' },
      [...compact, { hexcode: '1F600', unicode: '😀' }, { hexcode: '1F44D', unicode: '👍' }],
    );

    expect(map).toMatchObject({ grinning: '😀', '+1': '👍', thumbsup: '👍' });
    expect(map).not.toHaveProperty('gone');
  });

  it('refuses a set that shrank, which means the source changed shape', () => {
    const { shortcodes, compact } = filler(MIN_SHORTCODES - 1);

    expect(() => buildEmojiMap(shortcodes, compact)).toThrow(
      `Only ${String(MIN_SHORTCODES - 1)} shortcodes resolved; refusing to write.`,
    );
  });
});
