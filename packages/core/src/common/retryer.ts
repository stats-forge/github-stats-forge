import type { CardConfig } from './config.ts';
import { CardError } from './error.ts';
import type { FetcherContext, HttpResponse } from './http.ts';
import { logger } from './log.ts';

/**
 * Error-detection fields the retryer inspects to detect rate-limiting and credential failures.
 * Every fetcher's payload is intersected with
 * this, so the retryer can read `errors`/`message` regardless of the payload's own shape.
 */
interface ResponseErrors {
  errors?: Array<{ type?: string; message?: string }>;
  message?: string;
}

/** Delays before each retry of a transport failure, in milliseconds. */
const TRANSIENT_RETRY_DELAYS_MS = [100, 1000, 3000];

// not `node:timers/promises`: the anvil runs this library in a browser
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Whether a request was given up on rather than failing on its own:
 * a host's `AbortSignal.timeout`, or a caller cancelling.
 *
 * @returns Whether it was aborted.
 */
const isAborted = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

/**
 * Returns a random integer from 0 (inclusive) to `max` (exclusive).
 *
 * The value is generated using `Math.random()` and uniformly distributed
 * across the range.
 *
 * @returns A random integer `n` such that `0 <= n < max`.
 */
function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

/**
 * A fetcher's response. `TData` is the shape of `response.data`,
 * which is intersected with {@link ResponseErrors} so the retryer can inspect
 * `errors`/`message`.
 * Defaults to `unknown` (error fields only) for callers that don't care about the payload.
 */
type FetcherResponse<TData = unknown> = HttpResponse<TData & ResponseErrors>;

type FetcherFunction<TData = unknown, TVariables = Record<string, unknown>> = (
  variables: TVariables,
  token: string,
  context: FetcherContext,
) => Promise<FetcherResponse<TData>>;

/**
 * Try to execute the fetcher function until it succeeds or retries are exhausted.
 *
 * A rate limited or rejected token moves to the next PAT at once; a transport failure
 * is retried with the same one after the delays in {@link TRANSIENT_RETRY_DELAYS_MS}.
 *
 * @returns The response from the fetcher function.
 */
const retryer = async <TData = unknown, TVariables = Record<string, unknown>>(
  fetcher: FetcherFunction<TData, TVariables>,
  variables: TVariables,
  config: CardConfig,
): Promise<FetcherResponse<TData>> => {
  const PATs = config.pats;

  if (PATs.length === 0) {
    throw new CardError('No GitHub API tokens found', { code: 'no_tokens' });
  }
  const startPAT = getRandomInt(PATs.length);
  let transientFailures = 0;

  for (let attempt = 0; attempt - transientFailures < PATs.length; attempt += 1) {
    // a transport failure is not the token's fault, so it does not spend a turn of the rotation
    const patsTried = attempt - transientFailures;
    const currentPAT = PATs[(startPAT + patsTried) % PATs.length];
    if (!currentPAT) {
      continue;
    }

    let response: FetcherResponse<TData>;
    try {
      // a non-2xx comes back as a response, so only a transport failure throws
      response = await fetcher(variables, currentPAT.value, {
        fetch: config.fetch,
        retries: attempt,
      });
    } catch (error) {
      // a `CardError` has already said what went wrong, and an abort is the host spending a budget
      // of its own — retrying either one answers a question nobody asked
      if (error instanceof CardError || isAborted(error)) {
        throw error;
      }
      // the budget doubles as the delay table: out of delays is out of retries
      const delay = TRANSIENT_RETRY_DELAYS_MS[transientFailures];
      if (delay === undefined) {
        throw new CardError('Could not reach GitHub', { code: 'upstream', cause: error });
      }
      await sleep(delay);
      transientFailures += 1;
      continue;
    }

    // react on both type and message-based rate-limit signals.
    // https://github.com/anuraghazra/github-readme-stats/issues/4425
    const { errors } = response.data;
    const errorType = errors?.[0]?.type;
    const errorMsg = errors?.[0]?.message ?? '';
    const isRateLimited =
      (!!errors && errorType === 'RATE_LIMITED') || /rate limit/i.test(errorMsg);

    if (isRateLimited) {
      logger.log(`${currentPAT.name} Failed due to rate limiting`);
      continue;
    }

    // also checking for bad credentials if any tokens gets invalidated
    const { message } = response.data;
    const isBadCredential = message === 'Bad credentials';
    const isAccountSuspended = message === 'Sorry. Your account was suspended.';

    if (isBadCredential || isAccountSuspended) {
      logger.log(`${currentPAT.name} Failed due to bad credentials`);
      continue;
    }

    // anything else — including an HTTP error — is the caller's to interpret
    return response;
  }

  throw new CardError('Downtime due to GitHub API rate limiting', {
    code: 'rate_limited',
  });
};

export { retryer };
export type { FetcherResponse };
