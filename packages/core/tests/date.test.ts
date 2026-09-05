import { describe, expect, it } from 'vitest';

import {
  formatRange,
  getGitHubYearRange,
  parseRangeDate,
  toGitHubDateTime,
  toContributionRanges,
  toYearRanges,
} from '../src/common/date.ts';

describe('Test date.js', () => {
  it('should test toGitHubDateTime', () => {
    expect(toGitHubDateTime(new Date(Date.UTC(2024, 0, 1)))).toBe('2024-01-01T00:00:00Z');
    // milliseconds are dropped, not rounded
    expect(toGitHubDateTime(new Date('2024-06-15T10:20:30.999Z'))).toBe('2024-06-15T10:20:30Z');
  });

  it('should test getGitHubYearRange', () => {
    const { from, to } = getGitHubYearRange(2024);
    expect(toGitHubDateTime(from)).toBe('2024-01-01T00:00:00Z');
    expect(toGitHubDateTime(to)).toBe('2024-12-31T23:59:59Z');
  });

  it('should cover a leap day', () => {
    const { from, to } = getGitHubYearRange(2024);
    const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.ceil(days)).toBe(366);
  });

  it('should test parseRangeDate', () => {
    // a partial date covers the whole of what it names, widened towards the end being read
    expect(parseRangeDate('2024', 'from')).toStrictEqual(new Date('2024-01-01T00:00:00Z'));
    expect(parseRangeDate('2024', 'to')).toStrictEqual(new Date('2024-12-31T23:59:59Z'));
    expect(parseRangeDate('2024-02', 'to')).toStrictEqual(new Date('2024-02-29T23:59:59Z'));
    expect(parseRangeDate('2024-03-15', 'from')).toStrictEqual(new Date('2024-03-15T00:00:00Z'));
    expect(parseRangeDate('2024-03-15', 'to')).toStrictEqual(new Date('2024-03-15T23:59:59Z'));
  });

  it('should refuse what is not a date', () => {
    for (const value of ['', 'abc', '12', '20244', '2024-13', '2023-02-29', '2024-3-15']) {
      expect(parseRangeDate(value, 'from')).toBeUndefined();
    }
  });

  it('should test toYearRanges', () => {
    const slices = toYearRanges({
      from: new Date('2023-11-15T00:00:00Z'),
      to: new Date('2025-02-10T23:59:59Z'),
    });

    // one per calendar year, each clipped to the range
    expect(
      slices.map(({ from, to }) => [toGitHubDateTime(from), toGitHubDateTime(to)]),
    ).toStrictEqual([
      ['2023-11-15T00:00:00Z', '2023-12-31T23:59:59Z'],
      ['2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z'],
      ['2025-01-01T00:00:00Z', '2025-02-10T23:59:59Z'],
    ]);
    // an inverted range covers nothing
    expect(
      toYearRanges({
        from: new Date('2025-01-01T00:00:00Z'),
        to: new Date('2024-01-01T00:00:00Z'),
      }),
    ).toStrictEqual([]);
  });

  it('should test formatRange', () => {
    expect(formatRange(getGitHubYearRange(2024))).toBe('2024');
    expect(
      formatRange({ from: getGitHubYearRange(2020).from, to: getGitHubYearRange(2024).to }),
    ).toBe('2020–2024');
    // a range of anything but whole years has to name its dates
    expect(
      formatRange({ from: new Date('2024-03-15T00:00:00Z'), to: new Date('2024-06-30T23:59:59Z') }),
    ).toBe('2024-03-15 – 2024-06-30');
  });

  it('should test toContributionRanges', () => {
    const ranges = toContributionRanges([2024, 2020, 2022], {
      from: new Date('2021-06-01T00:00:00Z'),
      to: new Date('2024-12-31T23:59:59Z'),
    });

    // oldest first, only the years contributed in, each clipped to the range
    expect(
      ranges.map(({ from, to }) => [toGitHubDateTime(from), toGitHubDateTime(to)]),
    ).toStrictEqual([
      ['2022-01-01T00:00:00Z', '2022-12-31T23:59:59Z'],
      ['2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z'],
    ]);
  });
});
