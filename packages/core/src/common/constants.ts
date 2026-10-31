import type { RepositoryAffiliation } from '../graphql/generated/common.ts';

/** The year GitHub launched, and so the earliest one a card can be asked to count from. */
const GITHUB_EPOCH_YEAR = 2008;

/** A GitHub login: alphanumerics and single inner hyphens, 39 characters at most. */
const GITHUB_USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/**
 * A host and an optional port from 1 to 65535, with nothing that could carry a path, a query or
 * credentials. A port past the range would pass and then fail inside `fetch` as a retryable error.
 */
const HOSTNAME_PATTERN =
  /^[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)*(?::(?:6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{0,3}))?$/i;

/** A WakaTime or Wakapi username: one path segment, and never `.` or `..`. */
const WAKATIME_USERNAME_PATTERN = /^(?!\.+$)[\w.-]+$/;

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
  GITHUB_USERNAME_PATTERN,
  HOSTNAME_PATTERN,
  OWNER_AFFILIATIONS,
  WAKATIME_USERNAME_PATTERN,
};
