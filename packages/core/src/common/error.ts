import { OWNER_AFFILIATIONS } from './constants.ts';

/**
 * @file One error type for everything a card render can fail on.
 *
 * A failure carries a `code` a host can branch on, the two lines the error card
 * draws, and — through the code — whether repeating the request could help.
 * The fetchers throw this rather than a bare `Error`, so a host is told what failed.
 * Anything else that escapes is wrapped as `upstream` by `from`, which is retryable —
 * so a permanent failure has to throw a `CardError` to be reported as one.
 */

/** A general message to ask user to try again later. */
const TRY_AGAIN_LATER = 'Please try again later';

/** Why a request failed. */
type ErrorCode =
  /** The query is wrong: a param is malformed, unsafe, or not renderable. */
  | 'invalid_param'
  /** The query is missing a param the endpoint cannot render without. */
  | 'missing_param'
  /** The user, repository or gist does not exist. */
  | 'not_found'
  /** The deployment has no usable GitHub token. */
  | 'no_tokens'
  /** Every token is rate limited. */
  | 'rate_limited'
  /** GitHub or WakaTime answered with something unusable. */
  | 'upstream';

/**
 * Whether repeating the request could produce a different answer.
 * A host reads this to decide between caching the failure and retrying it.
 */
const RETRYABLE: Record<ErrorCode, boolean> = {
  invalid_param: false,
  missing_param: false,
  not_found: false,
  no_tokens: false,
  rate_limited: true,
  upstream: true,
};

/** The second line the error card draws, per code. */
const SECONDARY_ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  rate_limited: 'You can deploy own instance or wait until public will be no longer limited',
  no_tokens:
    'Please add an env variable called PAT_1 with your GitHub API token in your deployment environment',
  upstream: TRY_AGAIN_LATER,
};

/** What a failure is, once it reaches the api layer. */
interface CardErrorInit {
  /** Why it failed. */
  code: ErrorCode;
  /** Second line of the error card; the code's own message when omitted. */
  secondaryMessage?: string | undefined;
  /** The first param at fault, when the failure names one. */
  param?: string | undefined;
}

/** Everything this package throws. */
class CardError extends Error {
  readonly code: ErrorCode;
  readonly secondaryMessage: string | undefined;
  readonly param: string | undefined;

  constructor(message: string, init: CardErrorInit) {
    super(message);
    this.name = 'CardError';
    this.code = init.code;
    this.param = init.param;
    this.secondaryMessage = init.secondaryMessage ?? SECONDARY_ERROR_MESSAGES[init.code];
  }

  /** Whether repeating the request could produce a different answer. */
  get retryable(): boolean {
    return RETRYABLE[this.code];
  }

  /**
   * A param the endpoint cannot render with.
   *
   * @returns The error.
   */
  static invalidParam(param: string, secondaryMessage: string): CardError {
    return new CardError('Something went wrong', {
      code: 'invalid_param',
      secondaryMessage,
      param,
    });
  }

  /**
   * A param the endpoint cannot render without.
   * `param` carries the first; the message names them all.
   *
   * @returns The error.
   */
  static missingParam(params: Array<string>, secondaryMessage?: string): CardError {
    const named = params.map((param) => `"${param}"`).join(', ');
    return new CardError(`Missing params ${named} make sure you pass the parameters in URL`, {
      code: 'missing_param',
      secondaryMessage,
      param: params[0],
    });
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
    if (err instanceof Error) {
      return new CardError(err.message, { code: 'upstream' });
    }
    return new CardError('An unknown error occurred', { code: 'upstream' });
  }
}

/** The affiliation values `role` accepts, named in the rejection. */
const INVALID_AFFILIATION = `Invalid owner affiliations. Valid values are: ${OWNER_AFFILIATIONS.join(
  ', ',
)}`;

/** The user exists but has no public WakaTime profile. */
const WAKATIME_USER_NOT_FOUND = 'Make sure you have a public WakaTime profile';

/** A GitHub username that resolves to nothing, or to an organization. */
const USER_NOT_FOUND = 'Make sure the provided username is not an organization';

/** A repository the token cannot see, because it is missing or private. */
const REPO_NOT_FOUND = 'Make sure the provided username and repository are correct';

/** A gist id that resolves to nothing. */
const GIST_NOT_FOUND = 'Make sure the provided gist ID is correct';

export type { ErrorCode };

export {
  CardError,
  GIST_NOT_FOUND,
  INVALID_AFFILIATION,
  REPO_NOT_FOUND,
  SECONDARY_ERROR_MESSAGES,
  TRY_AGAIN_LATER,
  USER_NOT_FOUND,
  WAKATIME_USER_NOT_FOUND,
};
