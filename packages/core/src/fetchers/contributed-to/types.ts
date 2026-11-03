/** One repository a user contributed to, as the card ranks it. */
export interface ContributedRepo {
  nameWithOwner: string;
  /**
   * Commit-days plus issues and pull requests opened, summed over every year.
   * Not a commit count: GitHub groups commit contributions by day, not by commit.
   */
  contributions: number;
  /** Every year the user contributed to it, ascending. */
  years: Array<number>;
}

export interface ContributedToData {
  /** GitHub's own casing of the login, which the query param need not match. */
  login: string;
  /** The ranked slice, most contributions first. */
  repos: Array<ContributedRepo>;
  /** Every repository the walk found, which `repos` is a slice of. */
  totalRepos: number;
  /** The account's contribution years, ascending — the range the year marks cover. */
  years: Array<number>;
}
