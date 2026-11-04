import { afterEach, describe, expect, it, vi } from 'vitest';

// Type-only, by path: core keeps its generated query types and test helpers out of its exports.
import type { GetRepoQuery } from '../../../packages/core/src/graphql/generated/repo.ts';
import type { GraphQLBody } from '../../../packages/core/tests/_fetch-mock.ts';
import { readSettings } from '../src/config.ts';
import { createHandler } from '../src/handler.ts';
import { holdingUpstream } from '../src/upstream.ts';

import { GIST_ID, GIST_REPLY, RATE_LIMITED_REPLY, fakeGitHub } from './_fake-github.ts';
import type { FakeGitHub } from './_fake-github.ts';

const GRAPHQL = 'https://api.github.com/graphql';
const HOUR_MS = 60 * 60 * 1000;

/** What one held gist answer counts against the budget. */
const REPLY_SIZE = JSON.stringify(GIST_REPLY).length;

/** Room for every answer a test asks for. */
const BUDGET = 1024 * 1024;

/** A repository found under its owner's user half, the organization half naming nothing. */
const REPO_OF_A_USER_REPLY: GraphQLBody<GetRepoQuery> = {
  data: {
    user: {
      repository: {
        name: 'anvil',
        nameWithOwner: 'someone/anvil',
        isPrivate: false,
        isArchived: false,
        isTemplate: false,
        stargazerCount: 1,
        description: null,
        primaryLanguage: null,
        forkCount: 0,
        repositoryTopics: { nodes: [] },
      },
    },
    organization: null,
  },
  errors: [{ type: 'NOT_FOUND', path: ['organization'], message: 'Could not resolve' }],
};

/** A field the token may not read: another token might. */
const FORBIDDEN_REPLY: GraphQLBody<GetRepoQuery> = {
  data: { user: null, organization: null },
  errors: [{ type: 'FORBIDDEN', path: ['user'], message: 'Resource not accessible' }],
};

/** @returns A GraphQL request carrying `query`. */
const post = (query: string): RequestInit => ({ method: 'POST', body: JSON.stringify({ query }) });

/**
 * @returns How many requests reached GitHub for the gist card drawn in two themes, `between`
 * running after the first.
 */
const requestsForTwoThemes = async (
  env: Record<string, string>,
  between = (): void => {},
): Promise<number> => {
  const github = fakeGitHub(GIST_REPLY);
  vi.stubGlobal('fetch', github.fetch);
  const handler = createHandler(readSettings({ PAT_1: 'token', ...env }).options);

  await handler(new Request(`http://localhost/api/gist?id=${GIST_ID}&theme=ember_dark`));
  between();
  await handler(new Request(`http://localhost/api/gist?id=${GIST_ID}&theme=cobalt_light`));
  return github.calls.length;
};

const fiveMinutesLater = (): void => {
  vi.setSystemTime(Date.now() + 5 * 60 * 1000);
};

/** A transport answering only once released. */
interface HeldBack extends FakeGitHub {
  release: () => void;
}

/** @returns A transport answering the gist only when `release` is called. */
const heldBack = (): HeldBack => {
  const calls: Array<string> = [];
  const { promise, resolve } = Promise.withResolvers<undefined>();
  return {
    calls,
    release: () => {
      resolve(undefined);
    },
    fetch: async (url) => {
      calls.push(url);
      await promise;
      return Response.json(GIST_REPLY);
    },
  };
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe(holdingUpstream, () => {
  it('answers a request it has seen from the answer it kept', async () => {
    const github = fakeGitHub(GIST_REPLY);
    const fetch = holdingUpstream(github.fetch, 3600, BUDGET);

    const first = await fetch(GRAPHQL, post('{ gist }'));
    const second = await fetch(GRAPHQL, post('{ gist }'));

    expect(github.calls).toHaveLength(1);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toStrictEqual(await first.json());
  });

  it('holds a GET with no body, as WakaTime and the REST calls ask', async () => {
    const github = fakeGitHub({ data: { total_seconds: 3600 } });
    const fetch = holdingUpstream(github.fetch, 3600, BUDGET);
    const stats = 'https://wakatime.com/api/v1/users/someone/stats?is_including_today=true';

    await fetch(stats);
    await fetch(stats);
    await fetch(stats.replace('someone', 'someone-else'));

    expect(github.calls).toHaveLength(2);
  });

  it('asks again for a request with another body', async () => {
    const github = fakeGitHub(GIST_REPLY);
    const fetch = holdingUpstream(github.fetch, 3600, BUDGET);

    await fetch(GRAPHQL, post('{ gist }'));
    await fetch(GRAPHQL, post('{ viewer }'));

    expect(github.calls).toHaveLength(2);
  });

  it('shares a request still in flight', async () => {
    const github = fakeGitHub(GIST_REPLY);
    const fetch = holdingUpstream(github.fetch, 3600, BUDGET);

    await Promise.all([fetch(GRAPHQL, post('{ gist }')), fetch(GRAPHQL, post('{ gist }'))]);

    expect(github.calls).toHaveLength(1);
  });

  it.each([
    ['an answer carrying errors, as a rate limit does', RATE_LIMITED_REPLY],
    ['a failing status', new Response('{}', { status: 502 })],
    ['a body that is no JSON', new Response('<html>', { status: 200 })],
    ['a GraphQL answer with no data', {}],
    ['a field the token may not read', FORBIDDEN_REPLY],
  ])('never keeps %s', async (_what, reply) => {
    const github = fakeGitHub(reply);
    const fetch = holdingUpstream(github.fetch, 3600, BUDGET);

    await fetch(GRAPHQL, post('{ gist }'));
    await fetch(GRAPHQL, post('{ gist }'));

    expect(github.calls).toHaveLength(2);
  });

  it('never keeps a REST answer carrying a message, where GitHub says what went wrong', async () => {
    const github = fakeGitHub({ message: 'Bad credentials' });
    const fetch = holdingUpstream(github.fetch, 3600, BUDGET);
    const search = 'https://api.github.com/search/commits?q=author:someone';

    await fetch(search);
    await fetch(search);

    expect(github.calls).toHaveLength(2);
  });

  it('keeps a GraphQL answer whose only errors name what does not exist', async () => {
    const github = fakeGitHub(REPO_OF_A_USER_REPLY);
    const fetch = holdingUpstream(github.fetch, 3600, BUDGET);

    await fetch(GRAPHQL, post('{ repo }'));
    await fetch(GRAPHQL, post('{ repo }'));

    expect(github.calls).toHaveLength(1);
  });

  it('asks again for a caller whose shared request another caller gave up on', async () => {
    const calls: Array<string> = [];
    const fetch = holdingUpstream(
      async (url, init) => {
        calls.push(url);
        const signal = init?.signal;
        if (!signal) {
          return Promise.resolve(Response.json(GIST_REPLY));
        }
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(signal.reason as Error);
          });
        });
      },
      3600,
      BUDGET,
    );
    const impatient = new AbortController();

    const first = fetch(GRAPHQL, { ...post('{ gist }'), signal: impatient.signal });
    const second = fetch(GRAPHQL, post('{ gist }'));
    impatient.abort();

    await expect(first).rejects.toThrow(expect.objectContaining({ name: 'AbortError' }));
    await expect(second).resolves.toHaveProperty('status', 200);
    expect(calls).toHaveLength(2);
  });

  it('never keeps a transport failure', async () => {
    const github = fakeGitHub(new Error('offline'));
    const fetch = holdingUpstream(github.fetch, 3600, BUDGET);

    await expect(fetch(GRAPHQL, post('{ gist }'))).rejects.toThrow('offline');
    await expect(fetch(GRAPHQL, post('{ gist }'))).rejects.toThrow('offline');
    expect(github.calls).toHaveLength(2);
  });

  it('asks again once the answer has kept its time', async () => {
    vi.useFakeTimers();
    const github = fakeGitHub(GIST_REPLY);
    const fetch = holdingUpstream(github.fetch, 3600, BUDGET);

    await fetch(GRAPHQL, post('{ gist }'));
    vi.advanceTimersByTime(HOUR_MS);
    await fetch(GRAPHQL, post('{ gist }'));

    expect(github.calls).toHaveLength(2);
  });

  it('gives up the least used answer when the budget runs out', async () => {
    const github = fakeGitHub(GIST_REPLY);
    const fetch = holdingUpstream(github.fetch, 3600, 2 * REPLY_SIZE);

    await fetch(GRAPHQL, post('{ a }'));
    await fetch(GRAPHQL, post('{ b }'));
    await fetch(GRAPHQL, post('{ a }'));
    await fetch(GRAPHQL, post('{ c }'));
    expect(github.calls).toHaveLength(3);

    await fetch(GRAPHQL, post('{ a }'));
    expect(github.calls).toHaveLength(3);
    await fetch(GRAPHQL, post('{ b }'));
    expect(github.calls).toHaveLength(4);
  });

  it('lets an expired answer go before it pushes out one still fresh', async () => {
    vi.useFakeTimers();
    const github = fakeGitHub(GIST_REPLY);
    const fetch = holdingUpstream(github.fetch, 3600, 2 * REPLY_SIZE);

    await fetch(GRAPHQL, post('{ a }'));
    vi.advanceTimersByTime(HOUR_MS / 2);
    await fetch(GRAPHQL, post('{ b }'));
    await fetch(GRAPHQL, post('{ a }'));
    vi.advanceTimersByTime(HOUR_MS / 2);
    await fetch(GRAPHQL, post('{ c }'));
    expect(github.calls).toHaveLength(3);

    await fetch(GRAPHQL, post('{ b }'));
    expect(github.calls).toHaveLength(3);
  });

  it('never gives up a request still in flight to make room', async () => {
    const slow = heldBack();
    const github = fakeGitHub(GIST_REPLY);
    const fetch = holdingUpstream(
      async (url, init) => {
        if (typeof init?.body === 'string' && init.body.includes('slow')) {
          return slow.fetch(url, init);
        }
        return github.fetch(url, init);
      },
      3600,
      REPLY_SIZE,
    );

    const first = fetch(GRAPHQL, post('{ slow }'));
    await fetch(GRAPHQL, post('{ a }'));
    await fetch(GRAPHQL, post('{ b }'));
    const joined = fetch(GRAPHQL, post('{ slow }'));
    slow.release();
    await Promise.all([first, joined]);

    expect(slow.calls).toHaveLength(1);
  });

  it('never lets an answer larger than the whole budget push the others out', async () => {
    const calls: Array<string> = [];
    const fetch = holdingUpstream(
      async (url, init) => {
        calls.push(url);
        const big = typeof init?.body === 'string' && init.body.includes('big');
        return Promise.resolve(
          Response.json(big ? { data: 'x'.repeat(2 * REPLY_SIZE) } : GIST_REPLY),
        );
      },
      3600,
      REPLY_SIZE,
    );

    await fetch(GRAPHQL, post('{ gist }'));
    await fetch(GRAPHQL, post('{ big }'));
    await fetch(GRAPHQL, post('{ big }'));
    await fetch(GRAPHQL, post('{ gist }'));

    expect(calls).toHaveLength(3);
  });

  it('keeps nothing when the time or the budget is 0', () => {
    const github = fakeGitHub(GIST_REPLY);

    expect(holdingUpstream(github.fetch, 0, 10)).toBe(github.fetch);
    expect(holdingUpstream(github.fetch, 3600, 0)).toBe(github.fetch);
  });
});

describe('the server', () => {
  it('draws one card in two themes from one GitHub request', async () => {
    await expect(requestsForTwoThemes({})).resolves.toBe(1);
  });

  it.each([
    ['caching is off', { CACHE_SECONDS: '0' }],
    ['it holds no upstream answers', { CACHE_UPSTREAM_MB: '0' }],
  ])('asks GitHub every time when %s', async (_what, env) => {
    await expect(requestsForTwoThemes(env)).resolves.toBe(2);
  });

  it('asks GitHub again once an answer has been held for minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });

    await expect(requestsForTwoThemes({}, fiveMinutesLater)).resolves.toBe(2);
  });
});
