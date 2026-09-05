import { describe, expect, it } from 'vitest';

import { renderGistCard } from '../src/cards/gist.ts';
import { renderRepoCard } from '../src/cards/repo.ts';
import { renderStatsCard } from '../src/cards/stats.ts';
import { renderTopLanguages } from '../src/cards/top-languages.ts';
import { renderWakatimeCard } from '../src/cards/wakatime.ts';
import { renderError } from '../src/common/render.ts';
import type {
  GistData,
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

/** Every card, rendered with data that exercises its labels. */
const cards = {
  gist: (): string => renderGistCard(gistData),
  repo: (): string => renderRepoCard(repoData),
  stats: (): string => renderStatsCard(statsData),
  'top-languages': (): string => renderTopLanguages(topLangs),
  wakatime: (): string => renderWakatimeCard(wakatimeData),
};

const parse = (svg: string): SVGElement => {
  document.body.innerHTML = svg;
  const root = document.querySelector('svg');
  if (!root) {
    throw new Error('no <svg> rendered');
  }
  return root;
};

describe('card accessibility', () => {
  it.each(Object.entries(cards))('%s announces itself as a labelled image', (_name, render) => {
    const svg = parse(render());

    expect(svg).toHaveAttribute('role', 'img');
    // both ids, so the title is not merely present but actually announced
    expect(svg).toHaveAttribute('aria-labelledby', 'titleId descId');
  });

  it.each(Object.entries(cards))('%s labels itself with a non-empty title', (_name, render) => {
    parse(render());

    // at least one non-whitespace character, so an empty label fails
    expect(document.querySelector('title#titleId')).toHaveTextContent(/\S/);
  });

  it.each(Object.entries(cards))(
    '%s describes its content for a screen reader',
    (_name, render) => {
      parse(render());

      // `role="img"` hides the inner text, so an empty desc means the card's
      // numbers reach a screen reader as nothing at all.
      expect(document.querySelector('desc#descId')).toHaveTextContent(/\S/);
    },
  );

  it('names every id the label points at', () => {
    const svg = parse(renderStatsCard(statsData));

    const ids = svg.getAttribute('aria-labelledby')?.split(' ') ?? [];
    expect(ids).not.toHaveLength(0);
    for (const id of ids) {
      expect(document.querySelector(`#${id}`)).toBeInTheDocument();
    }
  });

  it('labels the error card, which a host renders in the same <img> slot', () => {
    const svg = parse(
      renderError({ message: 'Something went wrong', secondaryMessage: 'Try again' }),
    );

    expect(svg).toHaveAttribute('role', 'img');
    expect(document.querySelector('title#titleId')).toHaveTextContent('Something went wrong');
    expect(document.querySelector('desc#descId')).toHaveTextContent('Try again');
  });
});

describe('card accessibility and locale', () => {
  it('keeps the repo description free of untranslated English', () => {
    // The card honours `locale`, so its label must not introduce words the card cannot translate.
    parse(renderRepoCard(repoData, { locale: 'cn' }));

    const desc = document.querySelector('desc#descId')?.textContent ?? '';
    expect(desc).not.toMatch(/\b(?:Stars|Forks|Language)\b/);
  });
});
