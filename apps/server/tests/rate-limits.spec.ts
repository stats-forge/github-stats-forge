import type { FetchLike } from '@stats-forge/github-stats-forge-core/api';
import { describe, expect, it } from 'vitest';

import { RateLimits } from '../src/rate-limits.ts';

const PATS = [
  { name: 'PAT_1', value: 'one' },
  { name: 'PAT_2', value: 'two' },
];

/** @returns A transport answering with these rate-limit headers. */
const answering =
  (headers: Record<string, string>): FetchLike =>
  async () =>
    Promise.resolve(new Response('{}', { headers }));

describe(RateLimits, () => {
  it('knows nothing of a token GitHub has not answered for yet', () => {
    expect(new RateLimits(PATS).snapshot()).toStrictEqual([
      { name: 'PAT_1', remaining: null, limit: null, resetsAt: null },
      { name: 'PAT_2', remaining: null, limit: null, resetsAt: null },
    ]);
  });

  it('records the budget GitHub reported against the token the request carried', async () => {
    const limits = new RateLimits(PATS);
    const fetch = limits.observing(
      answering({
        'x-ratelimit-remaining': '4321',
        'x-ratelimit-limit': '5000',
        'x-ratelimit-reset': '1800000000',
      }),
    );

    await fetch('https://api.github.com/graphql', { headers: { Authorization: 'bearer two' } });

    expect(limits.snapshot()[1]).toStrictEqual({
      name: 'PAT_2',
      remaining: 4321,
      limit: 5000,
      resetsAt: '2027-01-15T08:00:00.000Z',
    });
    expect(limits.snapshot()[0]?.remaining).toBeNull();
  });

  it('ignores an answer without the headers, such as WakaTime’s', async () => {
    const limits = new RateLimits(PATS);
    const fetch = limits.observing(answering({}));

    await fetch('https://wakatime.com/api', { headers: { Authorization: 'bearer one' } });

    expect(limits.snapshot()[0]?.remaining).toBeNull();
  });

  it('never names a token it was not given', async () => {
    const limits = new RateLimits(PATS);
    const fetch = limits.observing(answering({ 'x-ratelimit-remaining': '1' }));

    await fetch('https://api.github.com/graphql', { headers: { Authorization: 'bearer other' } });
    await fetch('https://api.github.com/graphql');

    expect(limits.snapshot().map((limit) => limit.remaining)).toStrictEqual([null, null]);
  });
});
