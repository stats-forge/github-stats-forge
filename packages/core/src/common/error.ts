/**
 * @file One error type for everything a card render can fail on.
 *
 * A failure carries a `code` a host can branch on, the two lines the error card
 * draws, and — through the code — whether repeating the request could help.
 * The fetchers throw this rather than a bare `Error`, so a host is told what failed.
 * Anything else that escapes is wrapped as `upstream` by `from`, which is retryable —
 * so a permanent failure has to throw a `CardError` to be reported as one.
 * A failure is thrown by its reason, and `FAILURES` below is the only place it is worded.
 */

import { OWNER_AFFILIATIONS } from './constants.ts';
import type { GraphQLResponse } from './http.ts';
import { logger } from './log.ts';
import { wrapTextMultiline } from './text.ts';

/** Why a request failed. */
type ErrorCode =
  /** The token may not read a stat the query asked for. */
  | 'forbidden'
  /** The query is wrong: a param is malformed, unsafe, or not renderable. */
  | 'invalid_param'
  /** The query is missing a param the endpoint cannot render without. */
  | 'missing_param'
  /** The query is well-formed, but this deployment is pinned to identities it does not name. */
  | 'not_allowed'
  /** The user, repository or gist does not exist. */
  | 'not_found'
  /** No GitHub token is set, or GitHub rejected every one — retryable, the fix being a token on the next start. */
  | 'no_tokens'
  /** Every token is rate limited. */
  | 'rate_limited'
  /** GitHub or WakaTime answered with something unusable, or could not be reached at all. */
  | 'upstream';

/** What a failure is, once it reaches the api layer. */
interface CardErrorInit {
  /** Why it failed. */
  code: ErrorCode;
  /** Second line of the error card. */
  secondaryMessage?: string | undefined;
  /** The first param at fault, when the failure names one. */
  param?: string | undefined;
  /** What this failure was raised from. Kept for logs; the card never draws it. */
  cause?: unknown;
  /** Whether filing an issue could help; `true` when omitted. */
  reportable?: boolean | undefined;
}

/** One failure, worded: the first line of its card, and everything else it carries. */
interface Failure extends CardErrorInit {
  message: string;
}

/** The second line of upstream's own outage, which no issue could fix. */
const TRY_AGAIN_LATER = 'Please try again later';

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
    message: message ?? 'Could not fetch gist.',
    secondaryMessage: TRY_AGAIN_LATER,
    reportable: false,
  }),
  /** The first error GitHub answered a query with, and the response's status text. */
  github_error: ({ message, statusText }: { message: string; statusText: string }): Failure => ({
    code: 'upstream',
    // the card has one line for it, and GitHub's wording can run past that
    message: wrapTextMultiline(message, 525, 12)[0] ?? '',
    secondaryMessage: statusText,
  }),
  /** The transport failure the last retry ended on. */
  github_unreachable: ({ cause }: { cause: unknown }): Failure => ({
    code: 'upstream',
    message: 'Could not reach GitHub',
    secondaryMessage: TRY_AGAIN_LATER,
    cause,
    reportable: false,
  }),
  /** What the query asked for, as "the ___ using the GraphQL API" reads. */
  graphql_failed: ({ subject }: { subject: string }): Failure => ({
    code: 'upstream',
    message: `Something went wrong while trying to retrieve the ${subject} using the GraphQL API.`,
    secondaryMessage: TRY_AGAIN_LATER,
    reportable: false,
  }),
  invalid_affiliation: (): Failure => ({
    code: 'invalid_param',
    message: 'Something went wrong',
    secondaryMessage: `Invalid owner affiliations. Valid values are: ${OWNER_AFFILIATIONS.join(', ')}`,
    param: 'affiliation',
  }),
  /** The param a check rejected, and the check's own wording of why. */
  invalid_param: ({ param, detail }: { param: string; detail: string }): Failure => ({
    code: 'invalid_param',
    message: 'Something went wrong',
    secondaryMessage: detail,
    param,
  }),
  invalid_username: (): Failure => ({
    code: 'invalid_param',
    message: 'Invalid username provided.',
    param: 'username',
  }),
  // the caller's to fix, so the card links its docs instead of asking for an issue
  /** Every param missing, first the one at fault, and where to read how to pass them. */
  missing_param: ({
    params,
    hint,
  }: {
    params: Array<string>;
    hint?: string | undefined;
  }): Failure => ({
    code: 'missing_param',
    message: `Missing params ${params.map((param) => `"${param}"`).join(', ')} make sure you pass the parameters in URL`,
    secondaryMessage: hint,
    param: params[0],
    reportable: false,
  }),
  // names neither the value nor the list: one is the caller's, the other the operator's
  /** The identity param the deployment refused. */
  not_allowed: ({ param }: { param: string }): Failure => ({
    code: 'not_allowed',
    message: 'Not allowed',
    secondaryMessage: 'This deployment does not serve that account',
    param,
  }),
  org_activity_issues_forbidden: (): Failure => ({
    code: 'forbidden',
    message: 'Missing token permission',
    secondaryMessage:
      'The token needs read access to issues, or hide "issues_opened" and "issues_closed"',
  }),
  org_invalid: (): Failure => ({
    code: 'invalid_param',
    message: 'Invalid organization provided.',
    param: 'org',
  }),
  org_members_forbidden: (): Failure => ({
    code: 'forbidden',
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
    message: 'Downtime due to GitHub API rate limiting',
    secondaryMessage: 'You can deploy own instance or wait until public will be no longer limited',
    reportable: false,
  }),
  repo_not_found: (): Failure => ({
    code: 'not_found',
    message: 'Repository not found',
    secondaryMessage: 'Make sure the provided username and repository are correct',
  }),
  repo_unexpected_response: (): Failure => ({
    code: 'upstream',
    message: 'Unexpected behavior',
    secondaryMessage: TRY_AGAIN_LATER,
    reportable: false,
  }),
  stats_no_stats_or_rank: (): Failure => ({
    code: 'invalid_param',
    message: 'Could not render stats card.',
    secondaryMessage: 'Either stats or rank are required.',
  }),
  stats_search_count_unavailable: (): Failure => ({
    code: 'upstream',
    message: 'Could not fetch data from GitHub REST API.',
    secondaryMessage: TRY_AGAIN_LATER,
    reportable: false,
  }),
  tokens_missing: (): Failure => ({
    code: 'no_tokens',
    message: 'No GitHub API tokens found',
    secondaryMessage:
      'Please add an env variable called PAT_1 with your GitHub API token in your deployment environment',
  }),
  tokens_rejected: (): Failure => ({
    code: 'no_tokens',
    message: 'Every GitHub API token was rejected',
    secondaryMessage:
      'Replace the expired or revoked PAT_* variables in your deployment environment',
  }),
  // a login that resolves to nothing, or to an organization
  /** GitHub's own wording, when the query told it. */
  user_not_found: (data?: { message: string | undefined }): Failure => ({
    code: 'not_found',
    message: data?.message || 'Could not fetch user.',
    secondaryMessage: 'Make sure the provided username is not an organization',
  }),
  wakatime_invalid_host: (): Failure => ({
    code: 'invalid_param',
    message: 'Invalid WakaTime host provided.',
    param: 'wakatime_host',
  }),
  wakatime_unavailable: ({ username }: { username: string }): Failure => ({
    code: 'upstream',
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

/** Everything this package throws. */
class CardError extends Error {
  /**
   * Whether repeating the request could produce a different answer.
   * A host reads this to decide between caching the failure and retrying it.
   */
  static readonly #RETRYABLE: Record<ErrorCode, boolean> = {
    // the retryer starts at a random token, so the next request may pick one that is permitted
    forbidden: true,
    invalid_param: false,
    missing_param: false,
    not_allowed: false,
    not_found: false,
    no_tokens: true,
    rate_limited: true,
    upstream: true,
  };

  readonly code: ErrorCode;
  readonly secondaryMessage: string | undefined;
  readonly param: string | undefined;
  /** Whether filing an issue could help, which decides the card's report line. */
  readonly reportable: boolean;
  #reason: FailureReason | undefined;

  // only `because`, `from` and `fromGraphQL` build one, so every failure has a reason or is wrapped
  private constructor(message: string, init: CardErrorInit) {
    // `cause` is installed by its presence, so an absent one must not be passed as undefined
    super(message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = 'CardError';
    this.code = init.code;
    this.secondaryMessage = init.secondaryMessage;
    this.param = init.param;
    this.reportable = init.reportable ?? true;
  }

  /** Which failure this is; absent for one wrapped by `from`. */
  get reason(): FailureReason | undefined {
    return this.#reason;
  }

  /** Whether repeating the request could produce a different answer. */
  get retryable(): boolean {
    return CardError.#RETRYABLE[this.code];
  }

  /**
   * The failure `reason` names, worded from `data` when the reason needs any.
   *
   * @returns The error.
   */
  static because<TReason extends keyof typeof FAILURES>(
    reason: TReason,
    ...data: Parameters<(typeof FAILURES)[TReason]>
  ): CardError {
    // one entry's own signature, which `data` was checked against at the call site
    const word = FAILURES[reason] as (...args: typeof data) => Failure;
    const { message, ...init } = word(...data);
    const error = new CardError(message, init);
    error.#reason = reason;
    return error;
  }

  /**
   * Anything thrown that is not already a `CardError`:
   * an upstream failure, since the query itself got this far.
   *
   * @returns The error, unchanged when it already was one.
   */
  static from(err: unknown): CardError {
    if (err instanceof CardError) {
      return err;
    }
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return new CardError(message, {
      code: 'upstream',
      secondaryMessage: TRY_AGAIN_LATER,
      reportable: false,
    });
  }

  /**
   * The failure a GraphQL query answered with.
   *
   * @returns `not_found` when the user does not resolve; otherwise `upstream`, worded from the first entry or from `subject`.
   */
  static fromGraphQL(
    errors: NonNullable<GraphQLResponse<unknown>['data']['errors']>,
    statusText: string,
    /** What the query asked for, as "the ___ using the GraphQL API" reads. */
    subject: string,
  ): CardError {
    logger.error(errors);
    const [firstError] = errors;
    if (firstError?.type === 'NOT_FOUND') {
      return CardError.because('user_not_found', { message: firstError.message });
    }
    if (firstError?.message) {
      return CardError.because('github_error', { message: firstError.message, statusText });
    }
    return CardError.because('graphql_failed', { subject });
  }
}

/** The name of a failure, as `CardError.because` takes it. */
type FailureReason = Parameters<typeof CardError.because>[0];

export type { ErrorCode, FailureReason };

export { CardError };
