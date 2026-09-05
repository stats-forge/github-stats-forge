import type { GitHubDateRange } from '../common/date.ts';

import { aliasedRanges } from './contributionsCollection.ts';
import type { RangeContributionsFragment } from './generated/stats.ts';
import type { GraphQLDocument } from './graphqlDocument.ts';
import { graphqlDocument } from './graphqlDocument.ts';

interface ContributionsQueryVariables {
  login: string;
}

interface ContributionsQuery {
  user: Record<`range_${number}`, RangeContributionsFragment> | null;
}

/**
 * Build the contributions query for a set of ranges. The shape is only known at runtime.
 *
 * @returns Document for `createGraphQLFetcher`.
 */
const buildContributionsDocument = (
  ranges: Array<GitHubDateRange>,
): GraphQLDocument<ContributionsQuery, ContributionsQueryVariables> =>
  // fragment must match queries/stats.graphql, which generates its type
  graphqlDocument<ContributionsQuery, ContributionsQueryVariables>(`
query userContributions($login: String!) {
  user(login: $login) {
    ${aliasedRanges(ranges, 'RangeContributions')}
  }
}
fragment RangeContributions on ContributionsCollection {
  totalCommitContributions
  contributionCalendar {
    totalContributions
  }
}`);

export { buildContributionsDocument };
export type { ContributionsQuery };
