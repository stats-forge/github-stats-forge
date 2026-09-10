/**
 * @file A GitHub that answers from a literal, so an endpoint is tested with no network and no
 * token. It is the same seam a host uses: `CardConfig` already takes the transport.
 */

import { CardConfig } from '@stats-forge/github-stats-forge-core/api';
import type { FetchLike } from '@stats-forge/github-stats-forge-core/api';

import { CardCache } from '../src/cache.ts';
import type { ServerOptions } from '../src/handler.ts';

/** The gist the success cases draw, trimmed to what the card reads. */
const GIST_ID = '1f13e82cb48a9058ebcbf4945f5a1c20';

const GIST_REPLY = {
  data: {
    viewer: {
      gist: {
        description: 'List of countries and territories',
        owner: { login: 'Yizack' },
        stargazerCount: 33,
        forks: { totalCount: 11 },
        files: [{ name: 'countries.json', language: { name: 'JSON' }, size: 85_858 }],
      },
    },
  },
};

/** The same gist id, resolving to nothing. */
const GIST_NOT_FOUND_REPLY = { data: { viewer: { gist: null } } };

/** GitHub answering that every token is spent. */
const RATE_LIMITED_REPLY = {
  errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }],
};

/** A transport answering one body, counting what it was asked for. */
interface FakeGitHub {
  fetch: FetchLike;
  /** Every URL the transport was sent to, in order. */
  calls: Array<string>;
}

/**
 * @returns A transport answering `body`, or throwing when `body` is an `Error`.
 */
const fakeGitHub = (body: unknown): FakeGitHub => {
  const calls: Array<string> = [];

  return {
    calls,
    fetch: (url) => {
      calls.push(url);
      if (body instanceof Error) {
        return Promise.reject(body);
      }
      return Promise.resolve(Response.json(body));
    },
  };
};

/** A cache big enough that nothing under test is evicted for want of room. */
const testCache = (): CardCache => new CardCache(100);

/**
 * @returns Options whose transport answers `body`, and the transport itself. Defaulted to a
 * token, a fresh cache and lenient status codes.
 */
const optionsAnswering = (
  body: unknown,
  overrides: Partial<ServerOptions> = {},
): { options: ServerOptions; github: FakeGitHub } => {
  const github = fakeGitHub(body);

  return {
    github,
    options: {
      config: new CardConfig({ pats: [{ name: 'PAT_1', value: 'token' }], fetch: github.fetch }),
      strictHttpStatus: false,
      cacheSeconds: undefined,
      corsOrigin: undefined,
      cache: testCache(),
      site: undefined,
      ...overrides,
    },
  };
};

/** @returns Options answering the gist, for a test that never reaches the transport. */
const testOptions = (overrides: Partial<ServerOptions> = {}): ServerOptions =>
  optionsAnswering(GIST_REPLY, overrides).options;

export {
  GIST_ID,
  GIST_NOT_FOUND_REPLY,
  GIST_REPLY,
  RATE_LIMITED_REPLY,
  optionsAnswering,
  testCache,
  testOptions,
};
