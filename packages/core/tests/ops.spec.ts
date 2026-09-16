import { describe, expect, it } from 'vitest';

import {
  chunkArray,
  clampValue,
  lowercaseTrim,
  parseArray,
  parseBoolean,
  parseEmojis,
} from '../src/common/ops.ts';

describe('Test ops.js', () => {
  it('should test parseBoolean', () => {
    expect(parseBoolean(true)).toBe(true);
    expect(parseBoolean(false)).toBe(false);

    expect(parseBoolean('true')).toBe(true);
    expect(parseBoolean('false')).toBe(false);
    expect(parseBoolean('True')).toBe(true);
    expect(parseBoolean('False')).toBe(false);
    expect(parseBoolean('TRUE')).toBe(true);
    expect(parseBoolean('FALSE')).toBe(false);

    expect(parseBoolean('1')).toBeUndefined();
    expect(parseBoolean('0')).toBeUndefined();
    expect(parseBoolean('')).toBeUndefined();
    expect(parseBoolean(undefined)).toBeUndefined();
  });

  it('should test parseArray', () => {
    expect(parseArray('a,b,c')).toStrictEqual(['a', 'b', 'c']);
    expect(parseArray('a, b, c')).toStrictEqual(['a', ' b', ' c']); // preserves spaces
    expect(parseArray('')).toStrictEqual([]);
    expect(parseArray(undefined)).toStrictEqual([]);
  });

  it('should test clampValue', () => {
    expect(clampValue(5, 1, 10)).toBe(5);
    expect(clampValue(0, 1, 10)).toBe(1);
    expect(clampValue(15, 1, 10)).toBe(10);
    expect(clampValue(Number.NaN, 2, 5)).toBe(2);
  });

  it('should test lowercaseTrim', () => {
    expect(lowercaseTrim('  Hello World  ')).toBe('hello world');
    expect(lowercaseTrim('already lower')).toBe('already lower');
  });

  it('should test chunkArray', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]]);
    expect(chunkArray([1, 2, 3, 4, 5], 1)).toStrictEqual([[1], [2], [3], [4], [5]]);
    expect(chunkArray([1, 2, 3, 4, 5], 10)).toStrictEqual([[1, 2, 3, 4, 5]]);
  });

  it('should test parseEmojis', () => {
    // unknown emoji name is stripped
    expect(parseEmojis('Hello :nonexistent:')).toBe('Hello ');
    expect(parseEmojis('I :heart: OSS')).toBe('I ❤️ OSS');
    // shortcodes GitHub spells with `+` or `-`
    expect(parseEmojis(':+1: and :-1:')).toBe('👍️ and 👎️');
    expect(parseEmojis(':non-potable_water:')).toBe('🚱');
    // a flag and a recent addition, neither of which the old table carried
    expect(parseEmojis('made in :it:')).toBe('made in 🇮🇹');
    expect(parseEmojis(':melting_face:')).toBe('🫠');

    expect(() => parseEmojis('')).toThrow(/parseEmoji/);
    // @ts-expect-error testing missing argument
    expect(() => parseEmojis()).toThrow(/parseEmoji/);
  });
});
