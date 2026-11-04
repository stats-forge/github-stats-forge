import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import { renderStatsCard } from '../src/cards/stats/index.ts';
import { CARD_STYLE } from '../src/common/brand.ts';
import { HEAT_PAINT } from '../src/common/color.ts';
import type { StatsData } from '../src/fetchers/stats/types.ts';
import { themes } from '../src/themes/index.ts';

import { cssValue, draw, drawnIds, exactly, translateOf, heatStop } from './_card.ts';

const stats: StatsData = {
  login: 'anuraghazra',
  name: 'Anurag Hazra',
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
};

/** Every stat row the card can draw, in the order it draws them. */
const ALL_STATS = [
  'stars',
  'commits',
  'prs',
  'issues',
  'contributed_to',
  'reviews',
  'discussions_started',
  'discussions_answered',
  'prs_merged',
  'prs_merged_percentage',
  'contributions',
  'contributed_to_all_time',
];

describe('Test renderStatsCard', () => {
  it('should render correctly', () => {
    const card = draw(renderStatsCard(stats));

    expect(document.querySelector('.header')).toHaveTextContent(
      exactly("Anurag Hazra's GitHub Stats"),
    );
    expect(card).toHaveAttribute('height', '177');
    expect(screen.getByTestId('stars')).toHaveTextContent(exactly('100'));
    expect(screen.getByTestId('commits')).toHaveTextContent(exactly('200'));
    expect(screen.getByTestId('issues')).toHaveTextContent(exactly('300'));
    expect(screen.getByTestId('prs')).toHaveTextContent(exactly('400'));
    expect(screen.getByTestId('contributed_to')).toHaveTextContent(exactly('500'));
    expect(screen.queryByTestId('card-bg')).toBeInTheDocument();
    expect(screen.queryByTestId('rank-circle')).toBeInTheDocument();
    // WebKit draws a filtered shape at 1x, so the ring itself stays out of its glow.
    expect(screen.getByTestId('rank-ring')).not.toHaveAttribute('filter');
    expect(screen.getByTestId('rank-glow')).toHaveAttribute('filter', HEAT_PAINT.bloom);
    expect(drawnIds(ALL_STATS)).toStrictEqual([
      'stars',
      'commits',
      'prs',
      'issues',
      'contributed_to',
    ]);
  });

  it.each([
    ['Anil Das', "Anil Das' GitHub Stats"],
    ['Felix', "Felix's GitHub Stats"],
  ])('should give %s the right apostrophe', (name, title) => {
    draw(renderStatsCard({ ...stats, name }));
    expect(document.querySelector('.header')).toHaveTextContent(title);
  });

  it('should hide individual stats', () => {
    const card = draw(renderStatsCard(stats, { hide: ['issues', 'prs', 'contributed_to'] }));

    // the floor height, since two rows would make a stub of a card
    expect(card).toHaveAttribute('height', '150');
    expect(drawnIds(ALL_STATS)).toStrictEqual(['stars', 'commits']);
  });

  it('should show additional stats', () => {
    const show = [
      'reviews',
      'discussions_started',
      'discussions_answered',
      'prs_merged',
      'prs_merged_percentage',
    ] as const;
    const card = draw(renderStatsCard(stats, { show: [...show] }));

    expect(card).toHaveAttribute('height', '302');
    expect(drawnIds(ALL_STATS)).toStrictEqual([
      'stars',
      'commits',
      'prs',
      'issues',
      'contributed_to',
      ...show,
    ]);
  });

  it.each([
    ['contributions', '5k'],
    ['contributed_to_all_time', '500'],
  ] as const)('should show the %s stat when the show list names it', (stat, value) => {
    draw(renderStatsCard(stats, { show: [stat] }));
    expect(screen.getByTestId(stat)).toHaveTextContent(exactly(value));
  });

  it('leaves out a stat that is both shown and hidden', () => {
    draw(
      renderStatsCard(stats, {
        show: ['contributed_to_all_time'],
        hide: ['contributed_to_all_time'],
      }),
    );

    expect(screen.queryByTestId('contributed_to_all_time')).not.toBeInTheDocument();
  });

  it.each([
    [['vitest-dev/*'], 'PRs Created (vitest-dev/*)'],
    [['me/dotfiles', 'vitest-dev/*'], 'PRs Created (2 scopes)'],
  ])('names the scope of a search stat, and counts several (%j)', (scope, label) => {
    expect(draw(renderStatsCard(stats, { show: ['prs_opened'], scope }))).toHaveTextContent(label);
  });

  it('names the scope on the commits line only when commits are counted by search', () => {
    draw(renderStatsCard(stats, { scope: ['vitest-dev/*'] }));
    expect(screen.getByTestId('commits').closest('g')).not.toHaveTextContent('vitest-dev');

    const card = draw(
      renderStatsCard(stats, { include_all_commits: true, scope: ['vitest-dev/*'] }),
    );
    expect(card).toHaveTextContent('(vitest-dev/*)');
  });

  it('should hide_rank', () => {
    draw(renderStatsCard(stats, { hide_rank: true }));
    expect(screen.queryByTestId('rank-circle')).not.toBeInTheDocument();
  });

  it('should render with custom width set', () => {
    expect(draw(renderStatsCard(stats))).toHaveAttribute('width', '500');
    expect(draw(renderStatsCard(stats, { card_width: 500 }))).toHaveAttribute('width', '500');
  });

  // An explicit width is the caller's, so it is honoured however narrow, whatever else is drawn.
  it.each([
    { hide_rank: false, show_icons: false },
    { hide_rank: true, show_icons: false },
    { hide_rank: true, show_icons: true },
    { hide_rank: false, show_icons: true },
  ])(
    'should honour a card_width however narrow (hide_rank $hide_rank, show_icons $show_icons)',
    (options) => {
      expect(draw(renderStatsCard(stats, { card_width: 1, ...options }))).toHaveAttribute(
        'width',
        '1',
      );
    },
  );

  it('should render default colors properly', () => {
    draw(renderStatsCard(stats));

    expect(heatStop(1)).toBe('#e2470f');
    expect(cssValue('.stat', 'fill')).toBe('#2a1b14');
    expect(cssValue('.icon', 'fill')).toBe('#e2470f');
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#fffaf6');
  });

  it.each(Object.entries(themes))('should render with the %s theme', (theme, colors) => {
    draw(renderStatsCard(stats, { theme }));

    expect(heatStop(1)).toBe(`#${colors.heat[1]}`);
    expect(cssValue('.stat', 'fill')).toBe(`#${colors.text_color}`);
    expect(cssValue('.icon', 'fill')).toBe(`#${colors.heat[1]}`);
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', `#${colors.bg_color}`);
  });

  it('should draw its rank at its last frame where animations do not run', () => {
    draw(renderStatsCard(stats));

    const css = document.querySelector('style')?.textContent ?? '';
    const ringEnd = /rankAnimation[^}]*\}[^}]*to \{\s*stroke-dashoffset: (?<end>[\d.]+)/u.exec(css)
      ?.groups?.['end'];
    expect(ringEnd).toMatch(/^\d/u);
    expect(cssValue('.rank-circle', 'stroke-dashoffset')).toBe(ringEnd);
    expect(cssValue('.rank-text', 'transform')).toBe('translate(-5px, 5px)');
  });

  it('should render icons correctly', () => {
    draw(renderStatsCard(stats, { show_icons: true }));

    const stars = screen.getByTestId('stars');
    expect(screen.queryAllByTestId('icon')[0]).toBeInTheDocument();
    // the label, moved right to make room for the icon
    expect(stars.previousElementSibling).toHaveAttribute('x', '25');
  });

  it('should not have icons if show_icons is false', () => {
    draw(renderStatsCard(stats, { show_icons: false }));

    const stars = screen.getByTestId('stars');
    expect(screen.queryAllByTestId('icon')).toHaveLength(0);
    // the label, where it starts with no icon before it
    expect(stars.previousElementSibling).not.toHaveAttribute('x');
  });

  it('should right-align every value on one anchor, clear of the rank ring', () => {
    draw(renderStatsCard(stats));

    // One row per stat, so a default stat missing from `renderStatsCard.OPTIONS.hide` fails here.
    expect(document.querySelectorAll('.stagger')).toHaveLength(renderStatsCard.OPTIONS.hide.length);

    for (const id of renderStatsCard.OPTIONS.hide) {
      const value = screen.getByTestId(id);
      // The default 500 wide, less the padding, the row offset and the ring's gutter.
      expect(value).toHaveAttribute('x', '344');
      expect(value).toHaveAttribute('text-anchor', 'end');
    }
  });

  it('should keep the values off the labels on a card too narrow for the ring', () => {
    draw(renderStatsCard(stats, { card_width: 200 }));

    // Too narrow for the gutter, so the anchor sits just after the longest label instead.
    expect(screen.getByTestId('stars')).toHaveAttribute('x', '173');
  });

  it('should render the labels lighter than the values', () => {
    draw(renderStatsCard(stats));

    expect(screen.getByTestId('stars')).toHaveClass('bold');
    expect(document.querySelector('.stagger > .stat')).toHaveClass('not_bold');
  });

  it.each([{}, { title: 'Hello world' }])(
    'should auto resize if hide_rank is true (%o)',
    (options) => {
      expect(draw(renderStatsCard(stats, { hide_rank: true, ...options }))).toHaveAttribute(
        'width',
        '300',
      );
    },
  );

  it('should render translations', () => {
    draw(renderStatsCard(stats, { locale: 'cn' }));

    expect(document.querySelector('.header')).toHaveTextContent(
      exactly('Anurag Hazra 的 GitHub 统计数据'),
    );
    const labels = document.querySelectorAll('.stagger > .stat.not_bold');
    expect(labels[0]).toHaveTextContent(exactly('获标星数:'));
    expect(labels[1]).toHaveTextContent(exactly('累计提交总数 (去年):'));
    expect(labels[2]).toHaveTextContent(exactly('发起的 PR 总数:'));
    expect(labels[3]).toHaveTextContent(exactly('提出的 issue 总数:'));
    expect(labels[4]).toHaveTextContent(exactly('贡献的项目数（去年）:'));
  });

  it('should render without rounding', () => {
    draw(renderStatsCard(stats, { border_radius: 0 }));
    expect(document.querySelector('rect')).toHaveAttribute('rx', '0');
    draw(renderStatsCard(stats));
    expect(document.querySelector('rect')).toHaveAttribute('rx', '14');
  });

  it.each([
    [{}, '2k'],
    [{ number_format: 'long' }, '1999'],
    [{ number_precision: 2 }, '2.00k'],
    [{ number_format: 'long', number_precision: 2 }, '1999'],
  ] as const)('should shorten values (%o)', (options, commits) => {
    draw(renderStatsCard({ ...stats, totalCommits: 1999 }, options));
    expect(screen.getByTestId('commits')).toHaveTextContent(commits);
  });

  it('should center the rank ring between the values and the card edge', () => {
    const card = draw(renderStatsCard(stats));
    const width = Number(card.getAttribute('width'));

    // a value is right-anchored, so its own x is where the value column stops
    const value = screen.getByTestId('stars');
    expect(value).toHaveAttribute('text-anchor', 'end');
    const valuesEnd = translateOf(value.closest('g')).x + Number(value.getAttribute('x'));

    const rim = document.querySelector('.rank-circle-rim');
    const ringCenter =
      translateOf(screen.getByTestId('rank-circle')).x + Number(rim?.getAttribute('cx'));
    const radius = Number(rim?.getAttribute('r'));

    expect(ringCenter - radius - valuesEnd).toBeCloseTo(width - (ringCenter + radius));
  });

  it('should center the rank ring on the stat rows', () => {
    draw(renderStatsCard(stats));

    const rows = [...document.querySelectorAll('.stagger')];
    expect(rows).toHaveLength(5);
    const lastRowY = Math.max(...rows.map((row) => translateOf(row.parentElement).y));
    const rowsMiddle = (lastRowY + CARD_STYLE.statRowInk) / 2;
    const ringMiddle =
      translateOf(screen.getByTestId('rank-circle')).y +
      Number(document.querySelector('.rank-circle-rim')?.getAttribute('cy'));

    expect(ringMiddle).toBeCloseTo(rowsMiddle);
  });

  it('should render default rank icon with level A+', () => {
    draw(renderStatsCard(stats, { rank_icon: 'default' }));
    expect(screen.getByTestId('level-rank-icon')).toHaveTextContent(exactly('A+'));
  });

  it('should render github rank icon', () => {
    draw(renderStatsCard(stats, { rank_icon: 'github' }));
    expect(screen.queryByTestId('github-rank-icon')).toBeInTheDocument();
  });

  it('should show the rank percentile', () => {
    draw(renderStatsCard(stats, { rank_icon: 'percentile' }));
    expect(screen.getByTestId('percentile-top-header')).toHaveTextContent(exactly('Top'));

    const percentileRankValue = screen.getByTestId('percentile-rank-value');
    expect(percentileRankValue).toHaveClass('rank-percentile-text');
    expect(percentileRankValue).toHaveTextContent(`${stats.rank.percentile.toFixed(1)}%`);
  });

  it('should throw error if all stats and rank icon are hidden', () => {
    expect(() =>
      renderStatsCard(stats, { hide: [...renderStatsCard.OPTIONS.hide], hide_rank: true }),
    ).toThrow(expect.objectContaining({ reason: 'stats_no_stats_or_rank' }));
  });
});
