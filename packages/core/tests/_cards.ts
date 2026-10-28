/**
 * @file Every card, drawn from data that exercises its labels, for the specs that check all of them.
 */

import { renderContributedToCard } from '../src/cards/contributed-to/index.ts';
import { renderGistCard } from '../src/cards/gist/index.ts';
import { renderOrgActivityCard } from '../src/cards/org-activity/index.ts';
import { renderOrganizationCard } from '../src/cards/organization/index.ts';
import { renderRepoCard } from '../src/cards/repo/index.ts';
import { renderStatsCard } from '../src/cards/stats/index.ts';
import { renderTopLanguages } from '../src/cards/top-languages/index.ts';
import { renderWakatimeCard } from '../src/cards/wakatime/index.ts';
import type {
  ContributedToData,
  GistData,
  OrgActivityData,
  OrganizationData,
  RepositoryData,
  StatsData,
  TopLangData,
  WakaTimeData,
} from '../src/fetchers/types.ts';

const gistData: GistData = {
  name: 'test',
  nameWithOwner: 'anuraghazra/test',
  description: 'A gist',
  language: 'Python',
  starsCount: 163,
  forksCount: 19,
};

const repoData: RepositoryData = {
  name: 'convoychat',
  nameWithOwner: 'anuraghazra/convoychat',
  description: 'Help us take over the world!',
  primaryLanguage: { color: '#2b7489', id: '1', name: 'TypeScript' },
  isTemplate: false,
  isArchived: false,
  isPrivate: false,
  forkCount: 100,
  stargazerCount: 38_000,
};

const statsData: StatsData = {
  login: 'anuraghazra',
  name: 'Anurag Hazra',
  totalStars: 100,
  commitsRange: undefined,
  totalCommits: 200,
  totalIssues: 300,
  totalPRs: 400,
  totalReviews: 50,
  totalPRsMerged: 0,
  mergedPRsPercentage: 0,
  totalDiscussionsStarted: 0,
  totalDiscussionsAnswered: 0,
  contributedTo: 500,
  allTimeContributedTo: 0,
  totalPRsAuthored: 0,
  totalPRsCommented: 0,
  totalPRsReviewed: 0,
  totalIssuesAuthored: 0,
  totalIssuesCommented: 0,
  totalContributions: 0,
  rank: { level: 'A+', percentile: 5 },
};

const topLangs = {
  TypeScript: { name: 'TypeScript', color: '#0f0', size: 200, count: 2 },
  Python: { name: 'Python', color: '#0ff', size: 100, count: 1 },
} satisfies TopLangData;

const wakatimeData: Partial<WakaTimeData> = {
  languages: [
    {
      name: 'TypeScript',
      percent: 80,
      text: '8 hrs',
      hours: 8,
      minutes: 0,
      digital: '8:00',
      total_seconds: 28_800,
    },
    {
      name: 'Python',
      percent: 20,
      text: '2 hrs',
      hours: 2,
      minutes: 0,
      digital: '2:00',
      total_seconds: 7200,
    },
  ],
  human_readable_total: '10 hrs',
};

const orgActivityData: OrgActivityData = {
  login: 'vitest-dev',
  name: 'Vitest',
  range: { from: new Date('2026-08-14T00:00:00Z'), to: new Date('2026-09-12T00:00:00Z') },
  days: 30,
  prsOpened: 267,
  prsMerged: 169,
  issuesOpened: 82,
  issuesClosed: 66,
  discussionsOpened: 9,
  commits: 204,
};

const contributedToData: ContributedToData = {
  login: 'anuraghazra',
  repos: [
    { nameWithOwner: 'vitest-dev/vitest', contributions: 128, years: [2022, 2023] },
    { nameWithOwner: 'rollup/plugins', contributions: 64, years: [2023] },
  ],
  totalRepos: 37,
  years: [2022, 2023],
};

const organizationData: OrganizationData = {
  login: 'vitest-dev',
  name: 'Vitest',
  description: 'A blazing fast unit test framework powered by Vite',
  createdAt: '2021-12-08T09:47:15Z',
  publicRepos: 9,
  totalStars: 18_016,
  totalForks: 2093,
  totalWatchers: 95,
  openIssues: 376,
  openPRs: 84,
  totalReleases: 856,
  totalCommits: 12_410,
  publicMembers: 15,
  topLanguage: { name: 'TypeScript', color: '#3178c6' },
  truncated: false,
};

const cards = {
  gist: (): string => renderGistCard(gistData),
  repo: (): string => renderRepoCard(repoData),
  'org-activity': (): string => renderOrgActivityCard(orgActivityData),
  stats: (): string => renderStatsCard(statsData),
  'top-languages': (): string => renderTopLanguages(topLangs),
  wakatime: (): string => renderWakatimeCard(wakatimeData),
  'contributed-to': (): string => renderContributedToCard(contributedToData),
  organization: (): string => renderOrganizationCard(organizationData),
};

export { cards, repoData, statsData };
