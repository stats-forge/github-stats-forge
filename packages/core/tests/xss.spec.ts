import { describe, expect, it, vi } from 'vitest';

import type { ApiResult } from '../src/api/api-result.ts';
import { gist } from '../src/api/gist.ts';
import { pin } from '../src/api/pin.ts';
import { stats } from '../src/api/stats.ts';
import { topLangs } from '../src/api/top-langs.ts';
import { wakatime } from '../src/api/wakatime.ts';
import { CardConfig } from '../src/common/config.ts';

vi.mock(import('../src/fetchers/gist.ts'), () => ({
  fetchGist: vi.fn().mockResolvedValue({
    name: "<script>alert('xss')</script>",
    nameWithOwner: "<script>alert('xss')</script>",
    description: "<script>alert('xss')</script>",
    language: "<script>alert('xss')</script>",
    starsCount: 163,
    forksCount: 19,
  }),
}));

vi.mock(import('../src/fetchers/repo.ts'), () => ({
  fetchRepo: vi.fn().mockResolvedValue({
    nameWithOwner: "<script>alert('xss')</script>",
    name: "<script>alert('xss')</script>",
    description: "<script>alert('xss')</script>",
    primaryLanguage: {
      color: '#2b7489',
      id: "<script>alert('xss')</script>",
      name: "<script>alert('xss')</script>",
    },
    stargazerCount: 38_000,
    forkCount: 100,
  }),
}));

vi.mock(import('../src/fetchers/stats.ts'), () => ({
  fetchStats: vi.fn().mockResolvedValue({
    name: "<script>alert('xss')</script>",
    totalStars: 100,
    totalCommits: 200,
    totalIssues: 300,
    totalPRs: 400,
    totalPRsMerged: 320,
    mergedPRsPercentage: 80,
    totalReviews: 50,
    totalDiscussionsStarted: 10,
    totalDiscussionsAnswered: 50,
    contributedTo: 500,
    rank: { level: 'A+', percentile: 40 },
  }),
}));

vi.mock(import('../src/fetchers/top-languages.ts'), () => ({
  fetchTopLanguages: vi.fn().mockResolvedValue({
    HTML: { color: '#0f0', name: "<script>alert('xss')</script>", size: 200 },
    javascript: {
      color: '#0ff',
      name: "<script>alert('xss')</script>",
      size: 200,
    },
    css: { color: '#ff0', name: 'css', size: 100 },
  }),
}));

vi.mock(import('../src/fetchers/wakatime.ts'), () => ({
  fetchWakatimeStats: vi.fn().mockResolvedValue({
    categories: [
      {
        digital: '22:40',
        hours: 22,
        minutes: 40,
        name: 'Coding',
        percent: 100,
        text: '22 hrs 40 mins',
        total_seconds: 81_643.570077,
      },
    ],
    editors: [
      {
        digital: '22:40',
        hours: 22,
        minutes: 40,
        name: 'VS Code',
        percent: 100,
        text: '22 hrs 40 mins',
        total_seconds: 81_643.570077,
      },
    ],
    languages: [
      {
        digital: '0:19',
        hours: 0,
        minutes: 19,
        name: 'Other',
        percent: 1.43,
        text: '19 mins',
        total_seconds: 1170.434361,
      },
      {
        digital: '0:01',
        hours: 0,
        minutes: 1,
        name: "<script>alert('xss')</script>",
        percent: 0.1,
        text: '1 min',
        total_seconds: 83.293809,
      },
    ],
    operating_systems: [
      {
        digital: '22:40',
        hours: 22,
        minutes: 40,
        name: 'Mac',
        percent: 100,
        text: '22 hrs 40 mins',
        total_seconds: 81_643.570077,
      },
    ],
    is_coding_activity_visible: true,
    is_other_usage_visible: true,
    human_readable_daily_average: '4 hrs 28 mins',
    human_readable_total: '22 hrs 21 mins',
    range: 'last_7_days',
    username: "<script>alert('xss')</script>",
  }),
}));

// Unused: every fetcher is mocked, so no request is made.
const config = new CardConfig({ pats: [{ name: 'PAT_1', value: 'token' }] });

const xssPayloads = ["<script>alert('xss')</script>", "\"><script>alert('xss')</script>"];

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
