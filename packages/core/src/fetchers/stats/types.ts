import type { GitHubDateRange } from '../../common/date.ts';

export interface RepoUserStats {
  // only present when the matching include_* flag is set (see fetchRepoUserStats)
  totalPRsAuthored?: number;
  totalPRsCommented?: number;
  totalPRsReviewed?: number;
  totalIssuesAuthored?: number;
  totalIssuesCommented?: number;
}

export interface StatsData {
  /** GitHub's own casing of the login, which the search links name. */
  login: string;
  name: string;
  totalPRs: number;
  totalPRsMerged: number;
  mergedPRsPercentage: number;
  totalReviews: number;
  totalCommits: number;
  /** The range `totalCommits` covers; `undefined` when it is GitHub's own last year, or all time. */
  commitsRange: GitHubDateRange | undefined;
  totalIssues: number;
  totalStars: number;
  totalDiscussionsStarted: number;
  totalDiscussionsAnswered: number;
  contributedTo: number;
  allTimeContributedTo: number;
  totalPRsAuthored: number;
  totalPRsCommented: number;
  totalPRsReviewed: number;
  totalIssuesAuthored: number;
  totalIssuesCommented: number;
  totalContributions: number;
  rank: { level: string; percentile: number };
}
