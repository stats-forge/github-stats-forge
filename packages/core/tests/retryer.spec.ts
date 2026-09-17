import { describe, expect, it, vi } from 'vitest';

import { CardError } from '../src/common/error.ts';
import { retryer } from '../src/common/retryer.ts';

import { testConfig } from './_config.ts';

type Fetcher = Parameters<typeof retryer>[0];

vi.mock(import('../src/common/log.ts'), async () => {
  const { createLoggerMock } = await import('./utils.ts');
  return createLoggerMock();
});

const fetcher = vi.fn().mockResolvedValue({ data: 'ok' });

const fetcherFail = vi.fn().mockResolvedValue({
  data: { errors: [{ type: 'RATE_LIMITED' }] },
}) as unknown as Fetcher;

const fetcherFailOnSecondTry = vi.fn((_vars, _token, { retries }) => {
  if (retries < 1) {
    return Promise.resolve({ data: { errors: [{ type: 'RATE_LIMITED' }] } });
  }
  return Promise.resolve({ data: 'ok' });
}) as unknown as Fetcher;

const fetcherFailWithMessageBasedRateLimitErr = vi.fn((_vars, _token, { retries }) => {
  if (retries < 1) {
    return Promise.resolve({
      data: {
        errors: [
          {
            type: 'ASDF',
            message: 'API rate limit already exceeded for user ID 11111111',
          },
        ],
      },
    });
  }
  return Promise.resolve({ data: 'ok' });
}) as unknown as Fetcher;

const customFetcher = vi.fn((_variables: unknown, token: string) =>
  Promise.resolve({ data: { token } }),
) as unknown as Fetcher;

describe('Test Retryer', () => {
  it('retryer should return value and have zero retries on first try', async () => {
    const res = await retryer(fetcher, {}, testConfig);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(res).toStrictEqual({ data: 'ok' });
  });

  it('retryer should return value and have 2 retries', async () => {
    const res = await retryer(fetcherFailOnSecondTry, {}, testConfig);

    expect(fetcherFailOnSecondTry).toHaveBeenCalledTimes(2);
    expect(res).toStrictEqual({ data: 'ok' });
  });

  it('retryer should return value and have 2 retries with message based rate limit error', async () => {
    const res = await retryer(fetcherFailWithMessageBasedRateLimitErr, {}, testConfig);

    expect(fetcherFailWithMessageBasedRateLimitErr).toHaveBeenCalledTimes(2);
    expect(res).toStrictEqual({ data: 'ok' });
  });

  it('retryer should throw specific error if maximum retries reached', async () => {
    await expect(retryer(fetcherFail, {}, testConfig)).rejects.toThrow(
      'Downtime due to GitHub API rate limiting',
    );

    expect(fetcherFail).toHaveBeenCalledTimes(2);
  });

  it('retryer should retry a transient error after a delay', async () => {
    vi.useFakeTimers();
    try {
      const fetcherFailingOnce = vi.fn((_vars, _token, { retries }) => {
        if (retries < 1) {
          return Promise.reject(new Error('Network Error'));
        }
        return Promise.resolve({ data: 'ok' });
      }) as unknown as Fetcher;

      const result = retryer(fetcherFailingOnce, {}, testConfig);

      await vi.advanceTimersByTimeAsync(100);

      await expect(result).resolves.toStrictEqual({ data: 'ok' });
      expect(fetcherFailingOnce).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retryer should retry transient errors 3 times and then give up as upstream', async () => {
    vi.useFakeTimers();
    try {
      const networkError = new Error('Network Error');
      const fetcherNetworkError = vi.fn().mockRejectedValue(networkError) as unknown as Fetcher;

      // caught now, asserted at the end: the rejection would be unhandled while timers advance
      const settled = retryer(fetcherNetworkError, {}, testConfig).catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(100);
      expect(fetcherNetworkError).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1000);
      expect(fetcherNetworkError).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(3000);
      expect(fetcherNetworkError).toHaveBeenCalledTimes(4);

      const error = await settled;
      expect(error).toBeInstanceOf(CardError);
      expect(error).toMatchObject({
        code: 'upstream',
        message: 'Could not reach GitHub',
        cause: networkError,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('retryer should not retry a failure that already named itself', async () => {
    const rejected = new CardError('Invalid username provided.', {
      code: 'invalid_param',
      param: 'username',
    });
    const fetcherRejecting = vi.fn().mockRejectedValue(rejected) as unknown as Fetcher;

    await expect(retryer(fetcherRejecting, {}, testConfig)).rejects.toBe(rejected);

    expect(fetcherRejecting).toHaveBeenCalledTimes(1);
  });

  it('retryer should not retry a request the host gave up on', async () => {
    const timeout = new DOMException('The operation timed out.', 'TimeoutError');
    const fetcherTimingOut = vi.fn().mockRejectedValue(timeout) as unknown as Fetcher;

    await expect(retryer(fetcherTimingOut, {}, testConfig)).rejects.toBe(timeout);

    expect(fetcherTimingOut).toHaveBeenCalledTimes(1);
  });

  it('retryer should keep the PAT of a transient error and switch on a rate limit', async () => {
    vi.useFakeTimers();
    try {
      const tokens: Array<string> = [];
      const fetcherRateLimitThenNetwork = vi.fn((_vars, token: string, { retries }) => {
        tokens.push(token);
        if (retries === 0) {
          return Promise.resolve({ data: { errors: [{ type: 'RATE_LIMITED' }] } });
        }
        if (retries === 1) {
          return Promise.reject(new Error('Network Error'));
        }
        return Promise.resolve({ data: 'ok' });
      }) as unknown as Fetcher;

      const result = retryer(fetcherRateLimitThenNetwork, {}, testConfig);

      // the rate limited attempt is retried at once, the transient one is not
      await vi.advanceTimersByTimeAsync(99);
      expect(fetcherRateLimitThenNetwork).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1);

      await expect(result).resolves.toStrictEqual({ data: 'ok' });
      expect(fetcherRateLimitThenNetwork).toHaveBeenCalledTimes(3);
      expect(tokens[1]).not.toBe(tokens[0]);
      expect(tokens[2]).toBe(tokens[1]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retryer should use injected PATs when provided', async () => {
    const userConfig = testConfig.with({
      pats: [{ name: 'user PAT from database', value: 'user-pat-token' }],
    });
    const res = await retryer(customFetcher, {}, userConfig);

    expect(customFetcher).toHaveBeenCalledExactlyOnceWith({}, 'user-pat-token', {
      fetch: userConfig.fetch,
      retries: 0,
    });
    expect(res).toStrictEqual({ data: { token: 'user-pat-token' } });
  });
});
