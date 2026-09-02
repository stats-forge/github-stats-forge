import type { RepositoryAffiliation } from '../graphql/generated/common.js';

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

export { GITHUB_USERNAME_PATTERN, OWNER_AFFILIATIONS };
