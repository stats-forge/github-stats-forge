import { describe, expect, it } from 'vitest';

import {
  chunkArray,
  clampValue,
  excludes,
  lowercaseTrim,
  parseArray,
  parseEmojis,
} from '../src/common/ops.ts';

describe('common/ops', () => {
  it('should match an excluded repository by owner/name or by name, ignoring case', () => {
    const isExcluded = excludes(['Bellows', 'smith/Anvil']);
    expect(isExcluded('smith/bellows')).toBe(true);
    expect(isExcluded('SMITH/anvil')).toBe(true);
    expect(isExcluded('other/anvil')).toBe(false);
    expect(isExcluded('smith/tongs')).toBe(false);
  });

  it('splits a list on commas, dropping the blanks', () => {
    expect(parseArray('a,b,c')).toStrictEqual(['a', 'b', 'c']);
    expect(parseArray('a, b ,c')).toStrictEqual(['a', 'b', 'c']);
    expect(parseArray('a,,b,')).toStrictEqual(['a', 'b']);
    expect(parseArray(' , ')).toStrictEqual([]);
    expect(parseArray('')).toStrictEqual([]);
    expect(parseArray(undefined)).toStrictEqual([]);
  });

  it('clamps a value, and reads NaN as the minimum', () => {
    expect(clampValue(5, 1, 10)).toBe(5);
    expect(clampValue(0, 1, 10)).toBe(1);
    expect(clampValue(15, 1, 10)).toBe(10);
    expect(clampValue(Number.NaN, 2, 5)).toBe(2);
  });

  it('lowercases and trims', () => {
    expect(lowercaseTrim('  Hello World  ')).toBe('hello world');
    expect(lowercaseTrim('already lower')).toBe('already lower');
  });

  it('chunks an array, the last chunk taking the rest', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]]);
    expect(chunkArray([1, 2, 3, 4, 5], 1)).toStrictEqual([[1], [2], [3], [4], [5]]);
    expect(chunkArray([1, 2, 3, 4, 5], 10)).toStrictEqual([[1, 2, 3, 4, 5]]);
  });

  it('replaces emoji shortcodes, and drops one it does not know', () => {
    // unknown emoji name is stripped
    expect(parseEmojis('Hello :nonexistent:')).toBe('Hello ');
    expect(parseEmojis('I :heart: OSS')).toBe('I ❤️ OSS');
    // shortcodes GitHub spells with `+` or `-`
    expect(parseEmojis(':+1: and :-1:')).toBe('👍 and 👎');
    expect(parseEmojis(':non-potable_water:')).toBe('🚱');
    // a flag and a recent addition, neither of which the old table carried
    expect(parseEmojis('made in :it:')).toBe('made in 🇮🇹');
    expect(parseEmojis(':melting_face:')).toBe('🫠');

    expect(() => parseEmojis('')).toThrow(/parseEmoji/);
    // @ts-expect-error testing missing argument
    expect(() => parseEmojis()).toThrow(/parseEmoji/);
  });
});
