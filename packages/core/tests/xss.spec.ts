import { describe, expect, it, vi } from 'vitest';

import type { ApiResult } from '../src/api/api-result.ts';
import { gist } from '../src/api/gist.ts';
import { pin } from '../src/api/pin.ts';
import { stats } from '../src/api/stats.ts';
import { topLangs } from '../src/api/top-langs.ts';
import { wakatime } from '../src/api/wakatime.ts';
import { CardConfig } from '../src/common/config.ts';
import type {
  GistData,
  RepositoryData,
  StatsData,
  TopLangData,
  WakaTimeData,
} from '../src/fetchers/types.ts';

// Hoisted with the mocks, which run before anything else in the file is defined.
const { SCRIPT } = vi.hoisted(() => ({ SCRIPT: "<script>alert('xss')</script>" }));

vi.mock(import('../src/fetchers/gist.ts'), () => ({
  fetchGist: vi.fn().mockResolvedValue({
    name: SCRIPT,
    nameWithOwner: SCRIPT,
    description: SCRIPT,
    language: SCRIPT,
    starsCount: 163,
    forksCount: 19,
  } satisfies GistData),
}));

vi.mock(import('../src/fetchers/repo.ts'), () => ({
  fetchRepo: vi.fn().mockResolvedValue({
    nameWithOwner: SCRIPT,
    name: SCRIPT,
    description: SCRIPT,
    primaryLanguage: { color: '#2b7489', id: SCRIPT, name: SCRIPT },
    isPrivate: false,
    isArchived: false,
    isTemplate: false,
    stargazerCount: 38_000,
    forkCount: 100,
  } satisfies RepositoryData),
}));

vi.mock(import('../src/fetchers/stats.ts'), () => ({
  fetchStats: vi.fn().mockResolvedValue({
    login: 'user',
    name: SCRIPT,
    totalStars: 100,
    commitsRange: undefined,
    totalCommits: 200,
    totalIssues: 300,
    totalPRs: 400,
    totalPRsMerged: 320,
    mergedPRsPercentage: 80,
    totalReviews: 50,
    totalDiscussionsStarted: 10,
    totalDiscussionsAnswered: 50,
    contributedTo: 500,
    allTimeContributedTo: 500,
    totalPRsAuthored: 100,
    totalPRsCommented: 100,
    totalPRsReviewed: 100,
    totalIssuesAuthored: 100,
    totalIssuesCommented: 100,
    totalContributions: 5000,
    rank: { level: 'A+', percentile: 40 },
  } satisfies StatsData),
}));

vi.mock(import('../src/fetchers/top-languages.ts'), () => ({
  fetchTopLanguages: vi.fn().mockResolvedValue({
    HTML: { color: '#0f0', name: SCRIPT, size: 200, count: 1 },
    javascript: { color: '#0ff', name: SCRIPT, size: 200, count: 1 },
    css: { color: '#ff0', name: 'css', size: 100, count: 1 },
  } satisfies TopLangData),
}));

vi.mock(import('../src/fetchers/wakatime.ts'), async () => {
  const { wakaTimeData } = await import('./_wakatime.ts');
  const { data } = wakaTimeData;
  return {
    fetchWakatimeStats: vi.fn().mockResolvedValue({
      ...data,
      username: SCRIPT,
      languages: data.languages.map((language) => ({ ...language, name: SCRIPT })),
    } satisfies WakaTimeData),
  };
});

// Unused: every fetcher is mocked, so no request is made.
const config = new CardConfig({ pats: [{ name: 'PAT_1', value: 'token' }] });

const xssPayloads = [SCRIPT, `">${SCRIPT}`];

/**
 * Renders the result into the document and fails if a script survived.
 */
const expectNoScript = (result: ApiResult): void => {
  document.body.innerHTML = result.content;
  const svg = document.querySelector('svg');
  expect(svg?.querySelector('script')).toBeNull();
};

/** Each endpoint, the param that names whose card it is, and what else it needs to render. */
const endpoints = [
  { name: 'stats', handler: stats, identity: 'username', base: {} },
  { name: 'top-langs', handler: topLangs, identity: 'username', base: {} },
  { name: 'pin', handler: pin, identity: 'repo', base: { username: 'user' } },
  { name: 'gist', handler: gist, identity: 'id', base: {} },
  { name: 'wakatime', handler: wakatime, identity: 'username', base: {} },
];

describe.each(endpoints)('XSS prevention - $name API', ({ handler, identity, base }) => {
  // Every param the endpoint declares, read off its schema so a new one is covered the day it lands.
  const cases = Object.keys(handler.PARAMS)
    .filter((param) => param !== identity)
    .flatMap((param) => xssPayloads.map((payload): [string, string] => [param, payload]));

  it.each(cases)('should prevent XSS via %s (%s)', async (param, payload) => {
    expectNoScript(await handler({ ...base, [identity]: 'user', [param]: payload }, config));
  });

  it.each(xssPayloads)(`should prevent XSS via ${identity} (%s)`, async (payload) => {
    expectNoScript(await handler({ ...base, [identity]: payload }, config));
  });
});
