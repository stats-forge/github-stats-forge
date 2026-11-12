import type { RepositoryAffiliation } from '../graphql/generated/common.ts';

/** The year GitHub launched, and so the earliest one a card can be asked to count from. */
const GITHUB_EPOCH_YEAR = 2008;

/**
 * A GitHub login: alphanumerics and hyphens, 39 characters at most. A hyphen may lead, trail or
 * double, as older accounts' do.
 */
const GITHUB_USERNAME_PATTERN = /^[a-z\d-]{1,39}$/i;

/**
 * A host and an optional port from 1 to 65535, with nothing that could carry a path, a query or
 * credentials. A port past the range would pass and then fail inside `fetch` as a retryable error.
 */
const HOSTNAME_PATTERN =
  /^[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)*(?::(?:6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{0,3}))?$/i;

/** A repository's name, without its owner: never `.` or `..`, and 100 characters at most. */
const GITHUB_REPO_NAME_PATTERN = /^(?!\.+$)[\w.-]{1,100}$/;

/** A WakaTime or Wakapi username: one path segment, and never `.` or `..`. */
const WAKATIME_USERNAME_PATTERN = /^(?!\.+$)[\w.-]+$/;

/** The windows WakaTime keeps stats for, each a path segment of its stats endpoint. */
const WAKATIME_RANGES = [
  'last_7_days',
  'last_30_days',
  'last_6_months',
  'last_year',
  'all_time',
] as const;

/** What an organization calendar's weeks can count, each a search over the week. */
const ORG_CALENDAR_COUNTS = ['prs_merged', 'prs_opened', 'issues_opened', 'issues_closed'] as const;

/** Weeks one calendar can cover: two months, which GitHub searches well inside its 10s limit. */
const ORG_CALENDAR_MAX_WEEKS = 9;

/**
 * Valid owner affiliations for GitHub API queries.
 */
const OWNER_AFFILIATIONS: Array<RepositoryAffiliation> = [
  'OWNER',
  'COLLABORATOR',
  'ORGANIZATION_MEMBER',
];

/** @returns The affiliations asked for, or the user's own repositories when none are. */
const affiliationsOrOwner = (
  affiliations: Array<RepositoryAffiliation>,
): Array<RepositoryAffiliation> => {
  if (affiliations.length > 0) {
    return affiliations;
  }
  return ['OWNER'];
};

export {
  affiliationsOrOwner,
  GITHUB_EPOCH_YEAR,
  GITHUB_REPO_NAME_PATTERN,
  GITHUB_USERNAME_PATTERN,
  HOSTNAME_PATTERN,
  ORG_CALENDAR_COUNTS,
  ORG_CALENDAR_MAX_WEEKS,
  OWNER_AFFILIATIONS,
  WAKATIME_RANGES,
  WAKATIME_USERNAME_PATTERN,
};
