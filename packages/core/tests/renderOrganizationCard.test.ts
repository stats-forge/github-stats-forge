import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import { renderOrganizationCard } from '../src/cards/organization/index.ts';
import { CardError } from '../src/common/error.ts';
import type { OrganizationData } from '../src/fetchers/types.ts';

const data: OrganizationData = {
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

describe(renderOrganizationCard, () => {
  it('draws what the organization and its repositories add up to', () => {
    document.body.innerHTML = renderOrganizationCard(data);

    expect(document.querySelector('.header')).toHaveTextContent("Vitest's GitHub Organization");
    expect(screen.getByTestId('repos')).toHaveTextContent('9');
    expect(screen.getByTestId('stars')).toHaveTextContent('18k');
    expect(screen.getByTestId('forks')).toHaveTextContent('2.1k');
    expect(screen.getByTestId('watchers')).toHaveTextContent('95');
    expect(screen.getByTestId('open_issues')).toHaveTextContent('376');
    expect(screen.getByTestId('open_prs')).toHaveTextContent('84');
    expect(screen.getByTestId('description')).toHaveTextContent(
      'A blazing fast unit test framework powered by Vite',
    );
  });

  it('leaves the possessive off a name already ending in s', () => {
    document.body.innerHTML = renderOrganizationCard({ ...data, name: 'Rollup Plugins' });

    expect(document.querySelector('.header')).toHaveTextContent(
      "Rollup Plugins' GitHub Organization",
    );
  });

  it('draws the whole numbers when number_format is long', () => {
    document.body.innerHTML = renderOrganizationCard(data, { number_format: 'long' });

    expect(screen.getByTestId('stars')).toHaveTextContent('18016');
    expect(screen.getByTestId('forks')).toHaveTextContent('2093');
  });

  it('adds the rest only when show names them', () => {
    document.body.innerHTML = renderOrganizationCard(data);

    for (const id of ['releases', 'commits', 'members', 'top_language', 'created']) {
      expect(screen.queryByTestId(id)).not.toBeInTheDocument();
    }

    document.body.innerHTML = renderOrganizationCard(data, {
      show: ['releases', 'commits', 'members', 'top_language', 'created'],
    });

    expect(screen.getByTestId('releases')).toHaveTextContent('856');
    expect(screen.getByTestId('commits')).toHaveTextContent('12.4k');
    expect(screen.getByTestId('members')).toHaveTextContent('15');
    expect(screen.getByTestId('top_language')).toHaveTextContent('TypeScript');
    expect(screen.getByTestId('created')).toHaveTextContent('2021');
  });

  it('names the language as unspecified when no repository has one', () => {
    document.body.innerHTML = renderOrganizationCard(
      { ...data, topLanguage: null },
      { show: ['top_language'] },
    );

    expect(screen.getByTestId('top_language')).toHaveTextContent('Unspecified');
  });

  it('marks truncated totals as a lower bound', () => {
    document.body.innerHTML = renderOrganizationCard({ ...data, truncated: true });

    expect(screen.getByTestId('stars')).toHaveTextContent('18k+');
    expect(screen.getByTestId('forks')).toHaveTextContent('2.1k+');
    expect(screen.getByTestId('open_issues')).toHaveTextContent('376+');
    // the repository count is GitHub's own total, so the walk cannot have cut it short
    expect(screen.getByTestId('repos')).toHaveTextContent('9');
  });

  it('hides the stats named by hide', () => {
    document.body.innerHTML = renderOrganizationCard(data, {
      hide: ['stars', 'forks', 'watchers', 'open_issues', 'open_prs'],
    });

    expect(screen.getByTestId('repos')).toBeInTheDocument();
    expect(screen.queryByTestId('stars')).not.toBeInTheDocument();
    expect(screen.queryByTestId('open_prs')).not.toBeInTheDocument();
  });

  it('fails when hide leaves it nothing to draw', () => {
    expect(() =>
      renderOrganizationCard(data, {
        hide: ['repos', 'stars', 'forks', 'watchers', 'open_issues', 'open_prs'],
      }),
    ).toThrow(CardError);
  });

  it('falls back to a placeholder when the organization has no description', () => {
    document.body.innerHTML = renderOrganizationCard({ ...data, description: null });

    expect(screen.getByTestId('description')).toHaveTextContent('No description provided');
  });

  it('drops the description when hide_description is set', () => {
    document.body.innerHTML = renderOrganizationCard(data, { hide_description: true });

    expect(screen.queryByTestId('description')).not.toBeInTheDocument();
  });

  it('wraps the description onto at most two lines', () => {
    document.body.innerHTML = renderOrganizationCard({
      ...data,
      description:
        'The quick brown fox jumps over the lazy dog is an English-language pangram, a sentence that contains every letter of the alphabet',
    });

    expect(document.querySelectorAll('.description tspan').length).toBeLessThanOrEqual(2);
  });

  it('takes a custom title', () => {
    document.body.innerHTML = renderOrganizationCard(data, { custom_title: 'The Vitest team' });

    expect(document.querySelector('.header')).toHaveTextContent('The Vitest team');
  });

  it('grows the card and the value column with card_width', () => {
    document.body.innerHTML = renderOrganizationCard(data, { card_width: 500 });

    expect(document.querySelector('svg')).toHaveAttribute('width', '500');
    expect(screen.getByTestId('stars')).toHaveAttribute('x', '450');
  });

  it('describes itself for assistive technology', () => {
    document.body.innerHTML = renderOrganizationCard(data);

    expect(document.querySelector('title')).toHaveTextContent("Vitest's GitHub Organization");
    expect(document.querySelector('desc')).toHaveTextContent('Total stars: 18016');
  });
});
