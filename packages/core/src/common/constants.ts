import type { RepositoryAffiliation } from '../graphql/generated/common.ts';

/** The year GitHub launched, and so the earliest one a card can be asked to count from. */
const GITHUB_EPOCH_YEAR = 2008;

/** A GitHub login: alphanumerics and single inner hyphens, 39 characters at most. */
const GITHUB_USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/**
 * Valid owner affiliations for GitHub API queries.
 */
const OWNER_AFFILIATIONS: Array<RepositoryAffiliation> = [
  'OWNER',
  'COLLABORATOR',
  'ORGANIZATION_MEMBER',
];

export { GITHUB_EPOCH_YEAR, GITHUB_USERNAME_PATTERN, OWNER_AFFILIATIONS };
