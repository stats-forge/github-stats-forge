import type { ApiResult } from '@stats-forge/github-stats-forge-core/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardCache, cacheKey, ttlFor } from '../src/cache.ts';

const success: ApiResult = { status: 'success', content: '<svg />' };

const failure = (retryable: boolean): ApiResult => ({
  status: 'error',
  retryable,
  content: '<svg />',
  error: {
    code: retryable ? 'upstream' : 'not_found',
    message: '',
    secondaryMessage: undefined,
    param: undefined,
  },
});

afterEach(() => {
  vi.useRealTimers();
});

describe(ttlFor, () => {
  it('does not let a caller shorten how long a failure keeps', () => {
    expect(ttlFor(failure(false), 60)).toBe(3600);
    expect(ttlFor(failure(true), 60)).toBe(600);
  });

  it('turns everything off when the deployment asked for none', () => {
    expect(ttlFor(success, 0)).toBe(0);
    expect(ttlFor(failure(true), 0)).toBe(0);
  });
});

describe(cacheKey, () => {
  it('is the same for two orderings of one query', () => {
    const first = cacheKey('/api/stats', new URLSearchParams('username=a&theme=dark'));
    const second = cacheKey('/api/stats', new URLSearchParams('theme=dark&username=a'));

    expect(first).toBe(second);
  });

  it('separates two paths asking the same thing', () => {
    const params = new URLSearchParams('username=a');

    expect(cacheKey('/api/stats', params)).not.toBe(cacheKey('/api/top-langs', params));
  });
});

describe(CardCache, () => {
  it('forgets an entry once its TTL has run out', () => {
    vi.useFakeTimers();
    const cache = new CardCache(10);
    cache.set('k', success, 60);

    vi.advanceTimersByTime(59_000);
    expect(cache.get('k')?.age).toBe(59);

    vi.advanceTimersByTime(2000);
    expect(cache.get('k')).toBeUndefined();
  });

  it('stores nothing when caching is off', () => {
    const cache = new CardCache(10);
    cache.set('k', success, 0);

    expect(cache.size).toBe(0);
  });

  it('drops the oldest entry rather than growing past its cap', () => {
    const cache = new CardCache(3);
    for (const key of ['a', 'b', 'c', 'd']) {
      cache.set(key, success, 60);
    }

    expect(cache.size).toBe(3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('d')).toBeDefined();
  });

  it('sweeps what has expired before evicting anything still fresh', () => {
    vi.useFakeTimers();
    const cache = new CardCache(3);
    cache.set('stale', success, 60);
    cache.set('b', success, 3600);
    cache.set('c', success, 3600);

    vi.advanceTimersByTime(61_000);
    cache.set('d', success, 3600);

    expect(cache.get('b')).toBeDefined();
    expect(cache.get('d')).toBeDefined();
  });
});
