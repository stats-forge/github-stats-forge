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

/**
 * @returns One `[param, payload]` case per payload, for `it.each`.
 */
const casesFor = (params: Array<string>): Array<[string, string]> =>
  params.flatMap((param) => xssPayloads.map((payload): [string, string] => [param, payload]));

describe('XSS prevention - stats API', () => {
  const apiParamNames = [
    'repo',
    'owner',
    'hide',
    'hide_title',
    'hide_border',
    'card_width',
    'hide_rank',
    'show_icons',
    'include_all_commits',
    'from',
    'to',
    'line_height',
    'title_color',
    'ring_color',
    'icon_color',
    'text_color',
    'text_bold',
    'bg_color',
    'theme',
    'exclude_repo',
    'custom_title',
    'locale',
    'disable_animations',
    'border_radius',
    'number_format',
    'role',
    'number_precision',
    'border_color',
    'rank_icon',
    'show',
    'title_color_light',
    'ring_color_light',
    'icon_color_light',
    'text_color_light',
    'bg_color_light',
    'border_color_light',
    'theme_light',
    'title_color_dark',
    'ring_color_dark',
    'icon_color_dark',
    'text_color_dark',
    'bg_color_dark',
    'border_color_dark',
    'theme_dark',
  ];

  it.each(casesFor(apiParamNames))('should prevent XSS via %s (%s)', async (param, payload) => {
    const query: Record<string, string> = {
      username: 'user',
      [param]: payload,
    };
    expectNoScript(await stats(query, config));
  });

  it.each(xssPayloads)('should prevent XSS via username (%s)', async (payload) => {
    expectNoScript(await stats({ username: payload }, config));
  });
});

describe('XSS prevention - top-langs API', () => {
  const apiParamNames = [
    'hide',
    'hide_title',
    'hide_border',
    'card_width',
    'title_color',
    'text_color',
    'bg_color',
    'prog_bar_bg_color',
    'theme',
    'layout',
    'langs_count',
    'exclude_repo',
    'size_weight',
    'count_weight',
    'custom_title',
    'locale',
    'border_radius',
    'border_color',
    'role',
    'disable_animations',
    'hide_progress',
    'hide_values',
    'stats_format',
    'title_color_light',
    'text_color_light',
    'bg_color_light',
    'border_color_light',
    'prog_bar_bg_color_light',
    'theme_light',
    'title_color_dark',
    'text_color_dark',
    'bg_color_dark',
    'border_color_dark',
    'prog_bar_bg_color_dark',
    'theme_dark',
  ];

  it.each(casesFor(apiParamNames))('should prevent XSS via %s (%s)', async (param, payload) => {
    const query: Record<string, string> = {
      username: 'user',
      [param]: payload,
    };
    expectNoScript(await topLangs(query, config));
  });

  it.each(xssPayloads)('should prevent XSS via username (%s)', async (payload) => {
    expectNoScript(await topLangs({ username: payload }, config));
  });
});

describe('XSS prevention - pin API', () => {
  const apiParamNames = [
    'username',
    'hide_border',
    'title_color',
    'icon_color',
    'text_color',
    'bg_color',
    'card_width',
    'theme',
    'show_owner',
    'browser_rendering',
    'show',
    'show_icons',
    'number_format',
    'text_bold',
    'line_height',
    'locale',
    'border_radius',
    'border_color',
    'description_lines_count',
    'title_color_light',
    'icon_color_light',
    'text_color_light',
    'bg_color_light',
    'border_color_light',
    'theme_light',
    'title_color_dark',
    'icon_color_dark',
    'text_color_dark',
    'bg_color_dark',
    'border_color_dark',
    'theme_dark',
  ];

  it.each(casesFor(apiParamNames))('should prevent XSS via %s (%s)', async (param, payload) => {
    const query: Record<string, string> = { repo: 'repo', [param]: payload };
    expectNoScript(await pin(query, config));
  });

  it.each(xssPayloads)('should prevent XSS via repo (%s)', async (payload) => {
    expectNoScript(await pin({ repo: payload }, config));
  });
});

describe('XSS prevention - gist API', () => {
  const apiParamNames = [
    'title_color',
    'icon_color',
    'text_color',
    'bg_color',
    'theme',
    'locale',
    'border_radius',
    'border_color',
    'show_owner',
    'browser_rendering',
    'hide_border',
    'title_color_light',
    'icon_color_light',
    'text_color_light',
    'bg_color_light',
    'border_color_light',
    'theme_light',
    'title_color_dark',
    'icon_color_dark',
    'text_color_dark',
    'bg_color_dark',
    'border_color_dark',
    'theme_dark',
  ];

  it.each(casesFor(apiParamNames))('should prevent XSS via %s (%s)', async (param, payload) => {
    const query: Record<string, string> = {
      id: 'test-id',
      [param]: payload,
    };
    expectNoScript(await gist(query, config));
  });

  it.each(xssPayloads)('should prevent XSS via id (%s)', async (payload) => {
    expectNoScript(await gist({ id: payload }, config));
  });
});

describe('XSS prevention - wakatime API', () => {
  const apiParamNames = [
    'title_color',
    'icon_color',
    'hide_border',
    'card_width',
    'line_height',
    'text_color',
    'bg_color',
    'theme',
    'hide_title',
    'hide_progress',
    'custom_title',
    'locale',
    'layout',
    'langs_count',
    'hide',
    'api_domain',
    'border_radius',
    'border_color',
    'display_format',
    'disable_animations',
    'title_color_light',
    'icon_color_light',
    'text_color_light',
    'bg_color_light',
    'border_color_light',
    'theme_light',
    'title_color_dark',
    'icon_color_dark',
    'text_color_dark',
    'bg_color_dark',
    'border_color_dark',
    'theme_dark',
  ];

  it.each(casesFor(apiParamNames))('should prevent XSS via %s (%s)', async (param, payload) => {
    const query: Record<string, string> = {
      username: 'user',
      [param]: payload,
    };
    expectNoScript(await wakatime(query, config));
  });

  it.each(xssPayloads)('should prevent XSS via username (%s)', async (payload) => {
    expectNoScript(await wakatime({ username: payload }, config));
  });
});
