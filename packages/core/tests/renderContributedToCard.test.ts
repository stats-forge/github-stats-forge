import { screen } from '@testing-library/dom';
import { cssToObject } from '@uppercod/css-to-object';
import { describe, expect, it } from 'vitest';

import { MIN_CARD_WIDTH, renderContributedToCard } from '../src/cards/contributed-to.ts';
import type { ContributedToData } from '../src/fetchers/types.ts';
import { themes } from '../src/themes/index.ts';

const data: ContributedToData = {
  login: 'anuraghazra',
  repos: [
    { nameWithOwner: 'vitest-dev/vitest', contributions: 128, years: [2022, 2023, 2024] },
    { nameWithOwner: 'rollup/plugins', contributions: 64, years: [2023] },
    { nameWithOwner: 'sveltejs/svelte', contributions: 16, years: [2024] },
  ],
  totalRepos: 37,
  years: [2022, 2023, 2024],
};

describe('test renderContributedToCard', () => {
  it('should render every repository, ranked as it was given', () => {
    document.body.innerHTML = renderContributedToCard(data);

    const names = screen.queryAllByTestId('repo-name');
    expect(names).toHaveLength(3);
    expect(names[0]).toHaveTextContent('vitest-dev/vitest');
    expect(names[2]).toHaveTextContent('sveltejs/svelte');

    const counts = screen.queryAllByTestId('repo-contributions');
    expect(counts[0]).toHaveTextContent('128');
    expect(counts[2]).toHaveTextContent('16');
  });

  it('should name the account in the title', () => {
    document.body.innerHTML = renderContributedToCard(data);

    expect(document.querySelector('.header')).toHaveTextContent(
      'Repositories anuraghazra contributed to',
    );
  });

  it('should fall back to the plain title when the login makes it too wide', () => {
    document.body.innerHTML = renderContributedToCard({
      ...data,
      login: 'a-login-of-the-thirty-nine-characters-x',
    });

    expect(document.querySelector('.header')).toHaveTextContent('Repositories contributed to');
  });

  it('should color the title icon, which holds its own slot in the title either way', () => {
    document.body.innerHTML = renderContributedToCard(data);

    const styleTag = document.querySelector('style');
    const iconStyles = cssToObject(styleTag?.innerHTML ?? '')[':host']?.['.icon '];

    expect(document.querySelector('.icon')).toBeInTheDocument();
    expect(iconStyles?.['fill']?.trim()).toBe(`#${themes.default.icon_color}`);
  });

  it('should take a custom title', () => {
    document.body.innerHTML = renderContributedToCard(data, { custom_title: 'Where I work' });

    expect(document.querySelector('.header')).toHaveTextContent('Where I work');
  });

  it('should size the first bar full and the rest against it', () => {
    document.body.innerHTML = renderContributedToCard(data);

    const bars = screen.queryAllByTestId('lang-progress');
    expect(bars).toHaveLength(3);
    expect(bars[0]).toHaveAttribute('width', '100%');
    // 64 of 128
    expect(bars[1]).toHaveAttribute('width', '50%');
  });

  it('should mark the years a repository was contributed to, and only those', () => {
    document.body.innerHTML = renderContributedToCard(data);

    const strips = screen.queryAllByTestId('year-strip');
    expect(strips).toHaveLength(3);

    // one mark per contribution year of the account, whatever the repository got
    expect(strips[0]?.querySelectorAll('rect')).toHaveLength(3);
    expect(strips[0]?.querySelectorAll('[data-testid="year-on"]')).toHaveLength(3);

    // rollup/plugins got 2023 alone
    expect(strips[1]?.querySelectorAll('[data-testid="year-on"]')).toHaveLength(1);
    expect(strips[1]?.querySelectorAll('[data-testid="year-off"]')).toHaveLength(2);
  });

  it('should drop the year strip and its years when hide_years is set', () => {
    document.body.innerHTML = renderContributedToCard(data, { hide_years: true });

    expect(screen.queryByTestId('year-strip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('footer')).not.toHaveTextContent('2022');
  });

  it('should say how much of the walk it is showing', () => {
    document.body.innerHTML = renderContributedToCard(data);

    expect(screen.queryByTestId('footer')).toHaveTextContent(
      'top 3 of 37 repositories · 2022–2024',
    );
  });

  it('should drop the "top n of" when it shows every repository found', () => {
    document.body.innerHTML = renderContributedToCard({ ...data, totalRepos: 3 });

    expect(screen.queryByTestId('footer')).toHaveTextContent('3 repositories · 2022–2024');
  });

  it('should render an empty state rather than a bare footer', () => {
    document.body.innerHTML = renderContributedToCard({
      ...data,
      repos: [],
      totalRepos: 0,
    });

    expect(screen.queryByTestId('no-repos')).toHaveTextContent('No contributions found');
    expect(screen.queryByTestId('repo-name')).not.toBeInTheDocument();
    expect(screen.queryByTestId('footer')).toHaveTextContent('0 repositories');
  });

  it('should truncate a name that does not fit its column', () => {
    document.body.innerHTML = renderContributedToCard({
      ...data,
      repos: [
        {
          nameWithOwner: 'an-organisation-with-a-long-name/and-a-repository-longer-still',
          contributions: 1,
          years: [2024],
        },
      ],
    });

    const name = screen.queryByTestId('repo-name');
    expect(name).toHaveTextContent('…');
    expect(name).not.toHaveTextContent('longer-still');
  });

  it('should not shrink below the minimum width', () => {
    document.body.innerHTML = renderContributedToCard(data, { card_width: 100 });

    expect(document.querySelector('svg')).toHaveAttribute('width', String(MIN_CARD_WIDTH));
  });

  it('should repeat the rows and the footer in the accessibility description', () => {
    document.body.innerHTML = renderContributedToCard(data);

    const desc = document.querySelector('desc');
    expect(desc).toHaveTextContent('vitest-dev/vitest: 128 contributions in 2022, 2023, 2024');
    expect(desc).toHaveTextContent('top 3 of 37 repositories');
  });
});
