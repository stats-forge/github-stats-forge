import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import { renderRepoCard } from '../src/cards/repo/index.ts';
import { repoCardLocales } from '../src/cards/repo/locales.ts';
import { CARD_STYLE } from '../src/common/brand.ts';
import { measureText } from '../src/common/text.ts';
import type { RepositoryData } from '../src/fetchers/repo/types.ts';
import { themes } from '../src/themes/index.ts';

import {
  cssValue,
  draw,
  drawnIds,
  exactly,
  noMotionRules,
  translateOf,
  heatStop,
} from './_card.ts';

const repo: RepositoryData = {
  nameWithOwner: 'anuraghazra/convoychat',
  name: 'convoychat',
  description: 'Help us take over the world! React + TS + GraphQL Chat App',
  primaryLanguage: { color: '#2b7489', id: 'MDg6TGFuZ3VhZ2UyODc=', name: 'TypeScript' },
  isPrivate: false,
  isArchived: false,
  isTemplate: false,
  stargazerCount: 38_000,
  forkCount: 100,
};

const PANGRAM =
  'The quick brown fox jumps over the lazy dog is an English-language pangram—a sentence that contains all of the letters of the English alphabet';

// Semibold Helvetica Neue measured 1.097 times `measureText` in Chromium.
const ink = (text: string): number => measureText(text, 12) * 1.1;

describe('Test renderRepoCard', () => {
  it('should render correctly', () => {
    draw(renderRepoCard(repo));

    const header = document.querySelector('.header');
    expect(header).toHaveTextContent(exactly('convoychat'));
    expect(header).not.toHaveTextContent('anuraghazra');
    expect(document.querySelector('.description')).toHaveTextContent(
      exactly('Help us take over the world! React + TS + GraphQL Chat App'),
    );
    expect(screen.queryByTestId('stargazers')).toHaveTextContent(exactly('38k'));
    expect(screen.queryByTestId('forkcount')).toHaveTextContent(exactly('100'));
    expect(screen.queryByTestId('lang-name')).toHaveTextContent(exactly('TypeScript'));
    expect(screen.queryByTestId('lang-color')).toHaveAttribute('fill', '#2b7489');
  });

  it('should display username in title (full repo name)', () => {
    draw(renderRepoCard(repo, { show_owner: true }));
    expect(document.querySelector('.header')).toHaveTextContent(exactly('anuraghazra/convoychat'));
  });

  it('should trim header', () => {
    draw(renderRepoCard({ ...repo, name: 'some-really-long-repo-name-for-test-purposes' }));
    expect(document.querySelector('.header')).toHaveTextContent(
      exactly('some-really-long-repo-name-for-test...'),
    );
  });

  it('should trim description', () => {
    draw(renderRepoCard({ ...repo, description: PANGRAM }));

    const lines = document.querySelectorAll('.description tspan');
    expect(lines[0]).toHaveTextContent(
      exactly('The quick brown fox jumps over the lazy dog is an'),
    );
    expect(lines[1]).toHaveTextContent(
      exactly('English-language pangram—a sentence that contains all of the'),
    );
  });

  it('should not trim a short description', () => {
    draw(renderRepoCard({ ...repo, description: 'Small text should not trim' }));
    expect(document.querySelector('.description')).toHaveTextContent(
      exactly('Small text should not trim'),
    );
  });

  it('should render emojis', () => {
    draw(renderRepoCard({ ...repo, description: 'This is a text with a :poop: poo emoji' }));

    // poop emoji may not show in all editors but it's there between "a" and "poo"
    expect(document.querySelector('.description')).toHaveTextContent(
      exactly('This is a text with a 💩 poo emoji'),
    );
  });

  it('should hide language if primaryLanguage is null', () => {
    draw(renderRepoCard({ ...repo, primaryLanguage: null }));
    expect(screen.queryByTestId('primary-lang')).not.toBeInTheDocument();
  });

  it('should fall back for a language with no name or color', () => {
    draw(renderRepoCard({ ...repo, primaryLanguage: { color: null, name: null } }));

    expect(screen.queryByTestId('primary-lang')).toBeInTheDocument();
    expect(screen.queryByTestId('lang-color')).toHaveAttribute('fill', '#333');
    expect(screen.queryByTestId('lang-name')).toHaveTextContent(exactly('Unspecified'));
  });

  it('should render default colors properly', () => {
    draw(renderRepoCard(repo));

    expect(heatStop(1)).toBe('#e2470f');
    expect(cssValue('.description', 'fill')).toBe('#2a1b14');
    expect(cssValue('.icon', 'fill')).toBe('#e2470f');
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#fffaf6');
  });

  it.each(Object.entries(themes))('should render with the %s theme', (theme, colors) => {
    draw(renderRepoCard(repo, { theme }));

    expect(heatStop(1)).toBe(`#${colors.heat[1]}`);
    expect(cssValue('.description', 'fill')).toBe(`#${colors.text_color}`);
    expect(cssValue('.icon', 'fill')).toBe(`#${colors.heat[1]}`);
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', `#${colors.bg_color}`);
  });

  it.each([
    { stargazerCount: 0, forkCount: 100, drawn: ['forkcount'] },
    { stargazerCount: 1, forkCount: 0, drawn: ['stargazers'] },
    { stargazerCount: 0, forkCount: 0, drawn: [] },
  ])(
    'should draw a count only when it is not zero ($stargazerCount stars, $forkCount forks)',
    ({ stargazerCount, forkCount, drawn }) => {
      draw(renderRepoCard({ ...repo, stargazerCount, forkCount }));
      expect(drawnIds(['stargazers', 'forkcount'])).toStrictEqual(drawn);
    },
  );

  it.each([
    [{ isArchived: true }, 'en', 'Archived'],
    [{ isTemplate: true }, 'en', 'Template'],
    [{ isArchived: true }, 'zh-cn', '已归档'],
    [{ isTemplate: true }, 'zh-cn', '模板'],
  ])('should render the badge for %o in %s', (flag, locale, badge) => {
    draw(renderRepoCard({ ...repo, ...flag }, { locale }));
    expect(screen.queryByTestId('badge')).toHaveTextContent(badge);
  });

  it('should render no badge for a repository that is neither archived nor a template', () => {
    draw(renderRepoCard(repo));
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
  });

  it('should render without rounding', () => {
    draw(renderRepoCard(repo, { border_radius: 0 }));
    expect(document.querySelector('rect')).toHaveAttribute('rx', '0');
    draw(renderRepoCard(repo));
    expect(document.querySelector('rect')).toHaveAttribute('rx', '14');
  });

  it('should animate by default', () => {
    draw(renderRepoCard(repo));
    expect(noMotionRules()).toBe(1);
  });

  it('should draw the card with no animation when disable_animations is true', () => {
    draw(renderRepoCard(repo, { disable_animations: true }));
    expect(noMotionRules()).toBe(2);
  });

  it('should fallback to default description', () => {
    draw(renderRepoCard({ ...repo, description: null, isArchived: true }));
    expect(document.querySelector('.description')).toHaveTextContent(
      exactly('No description provided'),
    );
  });

  // The height follows the lines asked for, whether the description fills them or not.
  it.each([
    ['short', repo.description, 1, '105'],
    ['short', repo.description, 3, '135'],
    ['long', PANGRAM, 1, '105'],
    ['long', PANGRAM, 3, '135'],
  ])(
    'should size a %s description to description_lines_count %i',
    (_length, description, description_lines_count, height) => {
      expect(
        draw(renderRepoCard({ ...repo, description }, { description_lines_count })),
      ).toHaveAttribute('height', height);
    },
  );

  describe('topics', () => {
    const topics = ['react', 'typescript', 'graphql'];

    it('should draw the topics show names, in order, in a row of their own', () => {
      const card = draw(renderRepoCard({ ...repo, topics }, { show: ['topics'] }));

      const drawn = screen.getAllByTestId('topic');
      expect(drawn).toHaveLength(topics.length);
      for (const [index, topic] of topics.entries()) {
        expect(drawn[index]).toHaveTextContent(exactly(topic));
      }
      expect(card).toHaveAttribute('height', '131');
      expect(document.querySelector('desc')).toHaveTextContent('react, typescript, graphql');
    });

    it.each([
      ['show does not name them', { ...repo, topics }, {}],
      ['the repository has none', repo, { show: ['topics'] }],
    ])('should draw no row when %s', (_case, data, options) => {
      const card = draw(renderRepoCard(data, options));

      expect(screen.queryAllByTestId('topic')).toHaveLength(0);
      expect(card).toHaveAttribute('height', '105');
    });

    it('should stop at the first topic that does not fit', () => {
      const many = Array.from({ length: 20 }, (_, i) => `a-rather-long-topic-${i}`);
      draw(renderRepoCard({ ...repo, topics: many }, { show: ['topics'] }));

      const drawn = screen.getAllByTestId('topic');
      expect(drawn.length).toBeLessThan(many.length);
      const last = drawn.at(-1);
      const right =
        translateOf(last).x + Number(last?.querySelector('rect')?.getAttribute('width'));
      expect(right).toBeLessThanOrEqual(400 - 2 * 25);
      expect(document.querySelector('desc')).not.toHaveTextContent(many[drawn.length] ?? '');
    });
  });

  describe('every `show` stat at once', () => {
    const showStats = renderRepoCard.OPTIONS.show.filter((id) => id !== 'topics');
    const locales = [
      ...new Set(
        [
          repoCardLocales.prsOpened,
          repoCardLocales.prsCommented,
          repoCardLocales.prsReviewed,
          repoCardLocales.issuesOpened,
          repoCardLocales.issuesCommented,
        ].flatMap((wording) => Object.keys(wording)),
      ),
    ];
    const repository: RepositoryData = {
      ...repo,
      totalPRsAuthored: 1_234_567,
      totalPRsCommented: 4_567_890,
      totalPRsReviewed: 9876,
      totalIssuesAuthored: 321,
      totalIssuesCommented: 9_999_999,
    };

    it.each(locales)('keeps labels clear of values (%s)', (locale) => {
      const card = draw(
        renderRepoCard(repository, { show: [...showStats], locale, number_format: 'long' }),
      );
      expect(card).toHaveAttribute('width', '500');

      const rows = showStats.map((id) => {
        const value = screen.getByTestId(id);
        const row = value.closest('.stagger');
        // `-3` is the stats group, then the row's own offset.
        const x = -3 + translateOf(row?.parentElement).x + CARD_STYLE.padding.x;
        const label = row?.querySelector('text')?.textContent ?? '';
        const valueRight = x + Number(value.getAttribute('x'));
        return {
          left: x,
          labelRight: x + 23 + ink(label),
          valueLeft: valueRight - ink(value.textContent),
          valueRight,
        };
      });

      for (const row of rows) {
        expect(row.valueLeft - row.labelRight).toBeGreaterThanOrEqual(8);
        expect(row.valueRight).toBeLessThanOrEqual(500 - CARD_STYLE.padding.x);
      }
      // Stats fill the rows left to right: 0, 2, 4 in the first column, 1 and 3 in the second.
      const firstColumnRight = Math.max(
        ...rows.filter((_, i) => i % 2 === 0).map((r) => r.valueRight),
      );
      for (const row of rows.filter((_, i) => i % 2 === 1)) {
        expect(row.left).toBeGreaterThan(firstColumnRight);
      }
    });
  });
});
