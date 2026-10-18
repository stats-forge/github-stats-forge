import { describe, expect, it } from 'vitest';

import { formatBytes, kFormatter } from '../src/common/fmt.ts';

describe(kFormatter, () => {
  it.each([
    // value, then as written by default and at 0, 1 and 2 decimals
    [1, 1, '0k', '0.0k', '0.00k'],
    [-1, -1, '-0k', '-0.0k', '-0.00k'],
    [500, 500, '1k', '0.5k', '0.50k'],
    [1000, '1k', '1k', '1.0k', '1.00k'],
    [1200, '1.2k', '1k', '1.2k', '1.20k'],
    [10_000, '10k', '10k', '10.0k', '10.00k'],
    [12_345, '12.3k', '12k', '12.3k', '12.35k'],
    [99_900, '99.9k', '100k', '99.9k', '99.90k'],
    [9_900_000, '9900k', '9900k', '9900.0k', '9900.00k'],
  ])('writes %i as %s, then %s, %s and %s', (value, byDefault, zero, one, two) => {
    expect(kFormatter(value)).toBe(byDefault);
    expect(kFormatter(value, 0)).toBe(zero);
    expect(kFormatter(value, 1)).toBe(one);
    expect(kFormatter(value, 2)).toBe(two);
  });

  it('rounds to a whole thousand at 0 decimals', () => {
    expect(kFormatter(99_000, 0)).toBe('99k');
  });
});

describe(formatBytes, () => {
  it.each([
    [0, '0 B'],
    [100, '100.0 B'],
    [1024, '1.0 KB'],
    [1024 ** 2, '1.0 MB'],
    [1024 ** 3, '1.0 GB'],
    [1024 ** 4, '1.0 TB'],
    [1024 ** 5, '1.0 PB'],
    [1024 ** 6, '1.0 EB'],
    [1234 * 1024, '1.2 MB'],
    [123.4 * 1024, '123.4 KB'],
  ])('writes %i bytes as %s', (bytes, written) => {
    expect(formatBytes(bytes)).toBe(written);
  });
});
