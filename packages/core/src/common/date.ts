/** @file A range reaches GitHub one calendar year at a time; `contributionsCollection` refuses a longer one. */

import { GITHUB_EPOCH_YEAR } from './constants.ts';

/** A range between two dates, as GitHub's range arguments take it. */
interface GitHubDateRange {
  /** Start of the range, inclusive. */
  from: Date;
  /** End of the range, inclusive. */
  to: Date;
}

/** A year, a year and month, or a full date. */
const RANGE_DATE_PATTERN = /^(?<year>\d{4})(?:-(?<month>\d{2})(?:-(?<day>\d{2}))?)?$/;

/**
 * Format a date as a GitHub `DateTime` scalar.
 * Seconds precision, no milliseconds.
 *
 * @returns e.g. `2024-01-01T00:00:00Z`.
 */
const toGitHubDateTime = (date: Date): string => `${date.toISOString().slice(0, 19)}Z`;

/**
 * The full UTC range of a calendar year, both ends inclusive.
 *
 * The end matters to callers that would otherwise leave a range open:
 * GitHub's `contributionsCollection` defaults `to` to one year after `from`,
 * which pulls the next 1st of January into the year.
 *
 * @returns The range covering it.
 */
const getGitHubYearRange = (year: number): GitHubDateRange => ({
  from: new Date(Date.UTC(year, 0, 1)),
  to: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
});

/**
 * The widest range a card can be asked for: GitHub's first year through the end of this one.
 * The far end is the end of the year, not today, because a bare `to=2026` widens to its 31st of December.
 *
 * @returns The range, in UTC.
 */
const getWidestRange = (): GitHubDateRange => ({
  from: getGitHubYearRange(GITHUB_EPOCH_YEAR).from,
  to: getGitHubYearRange(new Date().getUTCFullYear()).to,
});

/**
 * The range a card counts within, from the ends the query named.
 *
 * @returns The range, each open end filled from {@link getWidestRange}.
 */
const toRange = (from: Date | undefined, to: Date | undefined): GitHubDateRange => {
  const widest = getWidestRange();
  return { from: from ?? widest.from, to: to ?? widest.to };
};

/**
 * Read one end of a range, written as `2024`, `2024-03` or `2024-03-15`.
 * A partial date covers the whole of what it names, so `2024` starts on the 1st of January
 * and ends on the 31st of December.
 *
 * @returns The instant, or `undefined` when the text does not name a date that exists.
 */
const parseRangeDate = (value: string, end: 'from' | 'to'): Date | undefined => {
  const match = RANGE_DATE_PATTERN.exec(value);
  if (!match) {
    return undefined;
  }

  const { year: yearText, month: monthText, day: dayText } = match.groups ?? {};
  const year = Number(yearText);
  const month = monthText === undefined ? 1 : Number(monthText);
  const day = dayText === undefined ? 1 : Number(dayText);

  const start = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls an impossible date forward rather than refusing it
  if (start.getUTCMonth() + 1 !== month || start.getUTCDate() !== day) {
    return undefined;
  }
  if (end === 'from') {
    return start;
  }

  const nextUnit =
    dayText !== undefined
      ? Date.UTC(year, month - 1, day + 1)
      : monthText !== undefined
        ? Date.UTC(year, month, 1)
        : Date.UTC(year + 1, 0, 1);
  return new Date(nextUnit - 1000);
};

/**
 * Split a range into one per calendar year, each clipped to it.
 *
 * @returns Them, oldest first; empty when the range is inverted.
 */
const toYearRanges = ({ from, to }: GitHubDateRange): Array<GitHubDateRange> => {
  const ranges: Array<GitHubDateRange> = [];
  for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year += 1) {
    const yearRange = getGitHubYearRange(year);
    const start = from > yearRange.from ? from : yearRange.from;
    const end = to < yearRange.to ? to : yearRange.to;
    if (start <= end) {
      ranges.push({ from: start, to: end });
    }
  }
  return ranges;
};

/**
 * Whole years as a card writes them.
 *
 * @returns e.g. `2024` or `2020–2024`.
 */
const formatYears = (first: number, last: number): string =>
  first === last ? `${first}` : `${first}–${last}`;

/**
 * A range as a card writes it, at the coarsest granularity that stays true.
 *
 * @returns e.g. `2024`, `2020–2024` or `2024-03-15 – 2024-06-30`.
 */
const formatRange = ({ from, to }: GitHubDateRange): string => {
  const firstYear = from.getUTCFullYear();
  const lastYear = to.getUTCFullYear();
  const wholeYears =
    from.getTime() === getGitHubYearRange(firstYear).from.getTime() &&
    to.getTime() === getGitHubYearRange(lastYear).to.getTime();

  if (!wholeYears) {
    return `${from.toISOString().slice(0, 10)} – ${to.toISOString().slice(0, 10)}`;
  }
  return formatYears(firstYear, lastYear);
};

/**
 * The ranges a walk asks GitHub for: one per calendar year the account contributed in.
 * Ordered here, which is what makes a walk's ties chronological.
 *
 * @returns Them, oldest first.
 */
const toContributionRanges = (
  contributionYears: ReadonlyArray<number>,
  range: GitHubDateRange,
): Array<GitHubDateRange> => {
  const contributed = new Set(contributionYears);
  return toYearRanges(range).filter((year) => contributed.has(year.from.getUTCFullYear()));
};

export {
  formatRange,
  formatYears,
  getWidestRange,
  getGitHubYearRange,
  parseRangeDate,
  toContributionRanges,
  toGitHubDateTime,
  toRange,
  toYearRanges,
};
export type { GitHubDateRange };
