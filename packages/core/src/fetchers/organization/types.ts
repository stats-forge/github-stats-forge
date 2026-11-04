/**
 * An organization, with its public repositories aggregated.
 * Every total is summed over the repositories the walk saw — public, non-fork ones,
 * most-starred first — so `truncated` says whether that was all of them.
 */
export interface OrganizationData {
  login: string;
  /** The organization's display name, or its login when it has none. */
  name: string;
  description: string | null;
  /** When the organization was created, as GitHub's own ISO 8601 instant. */
  createdAt: string;
  /** Public, non-fork repositories: the whole count, whether or not the walk saw them all. */
  publicRepos: number;
  totalStars: number;
  totalForks: number;
  totalWatchers: number;
  openIssues: number;
  openPRs: number;
  totalReleases: number;
  /**
   * Commits on the default branch of every repository counted: every author, merges included,
   * and whatever history a repository was imported with.
   */
  totalCommits: number;
  /**
   * Members GitHub shows publicly.
   * Membership is private by default, so this counts fewer people than the organization has.
   * `null` when the token may not read them, which is the card's cue to leave the stat out.
   */
  publicMembers: number | null;
  /** The language most of those repositories name as their primary one, `null` when none do. */
  topLanguage: { name: string; color: string | null } | null;
  /** Whether the repository walk stopped at its page cap, leaving the totals short. */
  truncated: boolean;
}
