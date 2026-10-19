import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardError } from '../src/common/error.ts';
import type { FetcherContext } from '../src/common/http.ts';
import { retryer } from '../src/common/retryer.ts';
import type { FetcherResponse } from '../src/common/retryer.ts';

import { testConfig } from './_config.ts';

vi.mock(import('../src/common/log.ts'), async () => {
  const { createLoggerMock } = await import('./utils.ts');
  return createLoggerMock();
});

/** What a fake fetcher's answer carries: a value, the token that asked, or why there is neither. */
interface Payload {
  value?: string;
  token?: string;
}

/** A fetcher as the retryer drives one. */
type Fetcher = (
  variables: Record<string, unknown>,
  token: string,
  context: FetcherContext,
) => Promise<FetcherResponse<Payload>>;

/** @returns A 200 carrying `data`, as the transport resolves one. */
const answer = (data: FetcherResponse<Payload>['data']): FetcherResponse<Payload> => ({
  status: 200,
  statusText: 'OK',
  data,
});

const OK = answer({ value: 'ok' });
const RATE_LIMITED = answer({ errors: [{ type: 'RATE_LIMITED' }] });

/** @returns A fetcher answering `first` on its first try, and `OK` after. */
const failingOnce = (first: FetcherResponse<Payload> | Error): ReturnType<typeof vi.fn<Fetcher>> =>
  vi.fn<Fetcher>((_variables, _token, { retries }) => {
    if (retries > 0) {
      return Promise.resolve(OK);
    }
    if (first instanceof Error) {
      return Promise.reject(first);
    }
    return Promise.resolve(first);
  });

afterEach(() => {
  vi.useRealTimers();
});

describe(retryer, () => {
  it('answers on the first try without retrying', async () => {
    const fetcher = vi.fn<Fetcher>().mockResolvedValue(OK);

    await expect(retryer(fetcher, {}, testConfig)).resolves.toStrictEqual(OK);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a rate limit', RATE_LIMITED],
    [
      'a rate limit named only in the message',
      answer({
        errors: [{ type: 'ASDF', message: 'API rate limit already exceeded for user ID 11111111' }],
      }),
    ],
  ])('retries once after %s, and answers', async (_what, first) => {
    const fetcher = failingOnce(first);

    await expect(retryer(fetcher, {}, testConfig)).resolves.toStrictEqual(OK);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reports a rate limit once every token has been tried', async () => {
    const fetcher = vi.fn<Fetcher>().mockResolvedValue(RATE_LIMITED);

    await expect(retryer(fetcher, {}, testConfig)).rejects.toMatchObject({
      reason: 'rate_limited',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reports every token rejected as no_tokens, not a rate limit', async () => {
    const fetcher = vi.fn<Fetcher>().mockResolvedValue(answer({ message: 'Bad credentials' }));

    await expect(retryer(fetcher, {}, testConfig)).rejects.toMatchObject({
      code: 'no_tokens',
      reason: 'tokens_rejected',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reports a rate limit when only some tokens were rejected', async () => {
    const fetcher = vi.fn<Fetcher>((_variables, token) => {
      if (token === 'dummyPAT1') {
        return Promise.resolve(answer({ message: 'Sorry. Your account was suspended.' }));
      }
      return Promise.resolve(RATE_LIMITED);
    });

    await expect(retryer(fetcher, {}, testConfig)).rejects.toMatchObject({ code: 'rate_limited' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retries a transient error after a delay', async () => {
    vi.useFakeTimers();
    const fetcher = failingOnce(new Error('Network Error'));

    const result = retryer(fetcher, {}, testConfig);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toStrictEqual(OK);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retries a transient error 3 times, then gives up as upstream', async () => {
    vi.useFakeTimers();
    const networkError = new Error('Network Error');
    const fetcher = vi.fn<Fetcher>().mockRejectedValue(networkError);

    // caught now, asserted at the end: the rejection would be unhandled while timers advance
    const settled = retryer(fetcher, {}, testConfig).catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(100);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetcher).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetcher).toHaveBeenCalledTimes(4);

    const error = await settled;
    expect(error).toBeInstanceOf(CardError);
    expect(error).toMatchObject({
      code: 'upstream',
      message: 'Could not reach GitHub',
      cause: networkError,
    });
  });

  it.each([
    ['a failure that already named itself', CardError.because('invalid_username')],
    ['a request the host gave up on', new DOMException('The operation timed out.', 'TimeoutError')],
  ])('does not retry %s', async (_what, failure) => {
    const fetcher = vi.fn<Fetcher>().mockRejectedValue(failure);

    await expect(retryer(fetcher, {}, testConfig)).rejects.toBe(failure);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps the PAT through a transient error and switches it on a rate limit', async () => {
    vi.useFakeTimers();
    const tokens: Array<string> = [];
    const fetcher = vi.fn<Fetcher>((_variables, token, { retries }) => {
      tokens.push(token);
      if (retries === 0) {
        return Promise.resolve(RATE_LIMITED);
      }
      if (retries === 1) {
        return Promise.reject(new Error('Network Error'));
      }
      return Promise.resolve(OK);
    });

    const result = retryer(fetcher, {}, testConfig);

    // the rate limited attempt is retried at once, the transient one is not
    await vi.advanceTimersByTimeAsync(99);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toStrictEqual(OK);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(tokens[1]).not.toBe(tokens[0]);
    expect(tokens[2]).toBe(tokens[1]);
  });

  it('uses the PATs the config carries', async () => {
    const userConfig = testConfig.with({
      pats: [{ name: 'user PAT from database', value: 'user-pat-token' }],
    });
    const fetcher = vi.fn<Fetcher>((_variables, token) => Promise.resolve(answer({ token })));

    await expect(retryer(fetcher, {}, userConfig)).resolves.toStrictEqual(
      answer({ token: 'user-pat-token' }),
    );
    expect(fetcher).toHaveBeenCalledExactlyOnceWith({}, 'user-pat-token', {
      fetch: userConfig.fetch,
      retries: 0,
    });
  });
});
