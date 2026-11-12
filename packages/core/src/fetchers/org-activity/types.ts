import type { GitHubDateRange } from '../../common/date.ts';

export interface OrgActivityData {
  /** GitHub's own casing of the login, which the query param need not match. */
  login: string;
  /** The organization's display name, or its login when it has none. */
  name: string;
  /** The one repository counted, in GitHub's casing; `null` when the whole organization is. */
  repository: string | null;
  /** The window every count covers, both ends inclusive. */
  range: GitHubDateRange;
  /** Days that window spans when it was asked for as days; `undefined` for a `from`/`to` range. */
  days: number | undefined;
  prsOpened: number;
  prsMerged: number;
  /**
   * Issues created in the window.
   * `null` when the token may not read them, which is the card's cue to leave the stat out —
   * GitHub answers such a token with pull requests rather than an error, so a number here
   * would be the pull request count under an issue's label.
   */
  issuesOpened: number | null;
  /** Issues closed in the window; `null` for the same reason as {@link OrgActivityData.issuesOpened}. */
  issuesClosed: number | null;
  discussionsOpened: number;
  /**
   * Commits authored in the window, across every repository of the organization.
   * `null` unless asked for: it is the one count the GraphQL request cannot answer,
   * so it costs a REST search of its own.
   */
  commits: number | null;
}
