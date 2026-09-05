import type { GitHubDateRange } from '../common/date.ts';
import { toGitHubDateTime } from '../common/date.ts';

/** Naming `to` is not optional: GitHub defaults an omitted one to a year after `from`. */
const contributionsCollectionOf = ({ from, to }: GitHubDateRange): string =>
  `contributionsCollection(from: "${toGitHubDateTime(from)}", to: "${toGitHubDateTime(to)}")`;

/**
 * One `contributionsCollection` field per range, aliased by position.
 *
 * @returns The fields, for a query that selects `fragment`.
 */
const aliasedRanges = (ranges: Array<GitHubDateRange>, fragment: string): string =>
  ranges
    .map((range, index) => `range_${index}: ${contributionsCollectionOf(range)} { ...${fragment} }`)
    .join('\n');

export { aliasedRanges };
