/**
 * @file The failures GitHub's and WakaTime's cards are thrown for, worded once and registered with
 * the kit's `CardError` on import: a module that throws one imports `CardError` from here.
 */

import {
  CardError,
  registerFailures,
  TRY_AGAIN_LATER,
  wrapTextMultiline,
} from '@stats-forge/card-kit';
import type { Failure, Logger } from '@stats-forge/card-kit';

import type { GraphQLResponse } from './http.ts';

/** @returns The names as prose: `a`, `a and b`, `a, b and c`. */
const listed = (names: ReadonlyArray<string>): string => {
  const last = names.at(-1) ?? '';
  if (names.length < 2) {
    return last;
  }
  return `${names.slice(0, -1).join(', ')} and ${last}`;
};

/** Every failure, by reason, worded from the data its throw site gives. */
const FAILURES = {
  // a gist with nothing to render will not gain a file on a retry
  gist_no_files: (): Failure => ({ code: 'not_found', message: 'Gist has no files' }),
  gist_not_found: (): Failure => ({
    code: 'not_found',
    message: 'Gist not found',
    secondaryMessage: 'Make sure the provided gist ID is correct',
  }),
  /** What GitHub said, when it said anything. */
  gist_unavailable: ({ message }: { message: string | undefined }): Failure => ({
    code: 'upstream',
    retryable: true,
    message: message ?? 'Could not fetch gist.',
    secondaryMessage: TRY_AGAIN_LATER,
    reportable: false,
  }),
  /** The first error GitHub answered a query with, and the response's status text. */
  github_error: ({ message, statusText }: { message: string; statusText: string }): Failure => ({
    code: 'upstream',
    retryable: true,
    // the card has one line for it, and GitHub's wording can run past that
    message: wrapTextMultiline(message, 525, 12)[0] ?? '',
    secondaryMessage: statusText,
  }),
  /** The transport failure the last retry ended on. */
  github_unreachable: ({ cause }: { cause: unknown }): Failure => ({
    code: 'upstream',
    retryable: true,
    message: 'Could not reach GitHub',
    secondaryMessage: TRY_AGAIN_LATER,
    cause,
    reportable: false,
  }),
  /** What the query asked for, as "the ___ using the GraphQL API" reads. */
  graphql_failed: ({ subject }: { subject: string }): Failure => ({
    code: 'upstream',
    retryable: true,
    message: `Something went wrong while trying to retrieve the ${subject} using the GraphQL API.`,
    secondaryMessage: TRY_AGAIN_LATER,
    reportable: false,
  }),
  invalid_username: (): Failure => ({
    code: 'invalid_param',
    message: 'Invalid username provided.',
    param: 'username',
  }),
  org_activity_issues_forbidden: (): Failure => ({
    code: 'forbidden',
    retryable: true,
    message: 'Missing token permission',
    secondaryMessage:
      'The token needs read access to issues, or hide "issues_opened" and "issues_closed"',
  }),
  org_calendar_issues_forbidden: (): Failure => ({
    code: 'forbidden',
    retryable: true,
    message: 'Missing token permission',
    secondaryMessage: 'The token needs read access to issues, or count pull requests instead',
  }),
  org_invalid: (): Failure => ({
    code: 'invalid_param',
    message: 'Invalid organization provided.',
    param: 'org',
  }),
  org_members_forbidden: (): Failure => ({
    code: 'forbidden',
    retryable: true,
    message: 'Missing token permission',
    secondaryMessage:
      'The token needs the organization "Members" permission, or drop "show=members"',
  }),
  /** The card, as "Could not render ___ card." reads. */
  org_no_stats: ({ card }: { card: string }): Failure => ({
    code: 'invalid_param',
    message: `Could not render ${card} card.`,
    secondaryMessage: 'At least one stat is required.',
  }),
  org_not_found: (): Failure => ({
    code: 'not_found',
    message: 'Organization not found',
    secondaryMessage: 'Make sure the provided organization exists and is not a user',
  }),
  rate_limited: (): Failure => ({
    code: 'rate_limited',
    retryable: true,
    message: 'Downtime due to GitHub API rate limiting',
    secondaryMessage: "Every token has hit GitHub's rate limit; try again later",
    reportable: false,
  }),
  repo_not_found: (): Failure => ({
    code: 'not_found',
    message: 'Repository not found',
    secondaryMessage: 'Make sure the provided username and repository are correct',
  }),
  stats_no_stats_or_rank: (): Failure => ({
    code: 'invalid_param',
    message: 'Could not render stats card.',
    secondaryMessage: 'Either stats or rank are required.',
  }),
  stats_search_count_unavailable: (): Failure => ({
    code: 'upstream',
    retryable: true,
    message: 'Could not fetch data from GitHub REST API.',
    secondaryMessage: TRY_AGAIN_LATER,
    reportable: false,
  }),
  tokens_missing: (): Failure => ({
    code: 'no_tokens',
    retryable: true,
    message: 'No GitHub API tokens found',
    secondaryMessage: 'Provide a GitHub token to render this card',
    // the host's to configure, which no issue could fix
    reportable: false,
  }),
  /** The name each rejected token was given in `CardConfig`. */
  tokens_rejected: ({ names }: { names: ReadonlyArray<string> }): Failure => ({
    code: 'no_tokens',
    retryable: true,
    message: 'Every GitHub API token was rejected',
    secondaryMessage: `${listed(names)} may be expired or revoked`,
    // the host's to replace, which no issue could fix
    reportable: false,
  }),
  // a login that resolves to nothing, or to an organization
  /** GitHub's own wording, when the query told it. */
  user_not_found: (data?: { message: string | undefined }): Failure => ({
    code: 'not_found',
    message: data?.message || 'Could not fetch user.',
    secondaryMessage: 'Make sure the provided username is not an organization',
  }),
  wakatime_invalid_range: (): Failure => ({
    code: 'invalid_param',
    message: 'Invalid WakaTime range provided.',
    param: 'range',
  }),
  wakatime_invalid_host: (): Failure => ({
    code: 'invalid_param',
    message: 'Invalid WakaTime host provided.',
    param: 'wakatime_host',
  }),
  wakatime_unavailable: ({ username }: { username: string }): Failure => ({
    code: 'upstream',
    retryable: true,
    message: `Could not fetch the WakaTime stats of '${username}'`,
    secondaryMessage: TRY_AGAIN_LATER,
    reportable: false,
  }),
  wakatime_user_not_found: ({ username }: { username: string }): Failure => ({
    code: 'not_found',
    message: `Could not resolve to a User with the login of '${username}'`,
    secondaryMessage: 'Make sure you have a public WakaTime profile',
  }),
};

type GitHubFailures = typeof FAILURES;

declare module '@stats-forge/card-kit' {
  // oxlint-disable-next-line typescript/no-empty-object-type -- adds this package's reasons
  interface Failures extends GitHubFailures {}
}

registerFailures(FAILURES);

/**
 * The failure a GraphQL query answered with.
 *
 * @returns `not_found` when the user does not resolve; otherwise `upstream`, worded from the first entry or from `subject`.
 */
const fromGraphQL = (
  errors: NonNullable<GraphQLResponse<unknown>['data']['errors']>,
  statusText: string,
  /** What the query asked for, as "the ___ using the GraphQL API" reads. */
  subject: string,
  /** Receives the whole list, of which the card shows only the first entry. */
  logger: Logger,
): CardError => {
  logger.error(errors);
  const [firstError] = errors;
  if (firstError?.type === 'NOT_FOUND') {
    return CardError.because('user_not_found', { message: firstError.message });
  }
  if (firstError?.message) {
    return CardError.because('github_error', { message: firstError.message, statusText });
  }
  return CardError.because('graphql_failed', { subject });
};

export { fromGraphQL };
export { CardError } from '@stats-forge/card-kit';
export type { ErrorCode, FailureReason } from '@stats-forge/card-kit';
