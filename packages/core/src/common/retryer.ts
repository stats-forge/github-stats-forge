import type { CardConfig } from './config.js';
import { CardError } from './error.js';
import type { FetcherContext, HttpResponse } from './http.js';
import { logger } from './log.js';

/**
 * Error-detection fields the retryer inspects to detect rate-limiting and credential failures.
 * Every fetcher's payload is intersected with
 * this, so the retryer can read `errors`/`message` regardless of the payload's own shape.
 */
interface ResponseErrors {
  errors?: Array<{ type?: string; message?: string }>;
  message?: string;
}

/**
 * Returns a random integer from 0 (inclusive) to `max` (exclusive).
 *
 * The value is generated using `Math.random()` and uniformly distributed
 * across the range.
 *
 * @param max The upper bound (exclusive). Must be a positive number.
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
 * Try to execute the fetcher function until it succeeds or the max number of retries is reached.
 *
 * @template TData Shape of `response.data` returned by the fetcher.
 * @template TVariables Variables the fetcher accepts.
 * @param fetcher The fetcher function.
 * @param variables Object with arguments to pass to the fetcher function.
 * @param config Deployment config supplying the PAT pool and the transport.
 * @returns The response from the fetcher function.
 */
const retryer = async <TData = unknown, TVariables = Record<string, unknown>>(
  fetcher: FetcherFunction<TData, TVariables>,
  variables: TVariables,
  config: CardConfig,
): Promise<FetcherResponse<TData>> => {
  const PATs = config.pats;

  if (!PATs.length) {
    throw new CardError('No GitHub API tokens found', { code: 'no_tokens' });
  }
  const startPAT = getRandomInt(PATs.length);

  for (let retries = 0; retries < PATs.length; retries++) {
    const currentPAT = PATs[(startPAT + retries) % PATs.length];
    if (!currentPAT) {
      continue;
    }

    // a non-2xx comes back as a response, so only a transport failure throws — and that is fatal
    const response = await fetcher(variables, currentPAT.value, {
      fetch: config.fetch,
      retries,
    });

    // react on both type and message-based rate-limit signals.
    // https://github.com/anuraghazra/github-readme-stats/issues/4425
    const errors = response.data.errors;
    const errorType = errors?.[0]?.type;
    const errorMsg = errors?.[0]?.message ?? '';
    const isRateLimited =
      (!!errors && errorType === 'RATE_LIMITED') || /rate limit/i.test(errorMsg);

    if (isRateLimited) {
      logger.log(`${currentPAT.name} Failed due to rate limiting`);
      continue;
    }

    // also checking for bad credentials if any tokens gets invalidated
    const message = response.data.message;
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
