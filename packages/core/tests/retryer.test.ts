import { describe, expect, it, vi } from 'vitest';

import { retryer } from '../src/common/retryer.js';

import { testConfig } from './_config.js';

type Fetcher = Parameters<typeof retryer>[0];

vi.mock(import('../src/common/log.js'), async () => {
  const { createLoggerMock } = await import('./utils.js');
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
