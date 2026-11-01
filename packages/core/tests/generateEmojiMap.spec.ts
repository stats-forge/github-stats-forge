import { describe, expect, it } from 'vitest';

import {
  buildEmojiMap,
  MIN_SHORTCODES,
  parseCompact,
  parseLatest,
  parseShortcodes,
} from '../scripts/emoji-map.ts';
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

describe('parsing a download', () => {
  it('reads what emojibase serves', () => {
    expect(parseLatest({ version: '17.0.0', name: 'emojibase-data' })).toBe('17.0.0');
    expect(parseShortcodes({ '1F44D': ['+1', 'thumbsup'], '1F600': 'grinning' })).toStrictEqual({
      '1F44D': ['+1', 'thumbsup'],
      '1F600': 'grinning',
    });
    expect(
      parseCompact([{ hexcode: '1F600', unicode: '😀', label: 'grinning face' }]),
    ).toStrictEqual([{ hexcode: '1F600', unicode: '😀' }]);
  });

  it.each<[string, (value: unknown) => unknown, unknown, string]>([
    ['a registry error', parseLatest, { error: 'Not found' }, 'emojibase-data/latest'],
    ['a shortcode that is a number', parseShortcodes, { '1F600': 1 }, 'shortcodes/github.json'],
    ['shortcodes as a list', parseShortcodes, ['grinning'], 'shortcodes/github.json'],
    ['an emoji without its unicode', parseCompact, [{ hexcode: '1F600' }], 'compact.json'],
    ['a table keyed by hexcode', parseCompact, { '1F600': '😀' }, 'compact.json'],
  ])('refuses %s', (_, parse, value, file) => {
    expect(() => parse(value)).toThrow(`${file} is not shaped as expected:`);
  });
});
