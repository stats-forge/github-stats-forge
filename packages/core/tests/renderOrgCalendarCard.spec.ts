import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import { renderOrgCalendarCard } from '../src/cards/org-calendar/index.ts';
import { CARD_STYLE } from '../src/common/brand.ts';
import { getCardColors } from '../src/common/color.ts';
import type { OrgCalendarData } from '../src/fetchers/types.ts';

import { cssValue, exactly } from './_card.ts';

/** @returns Weeks ending on consecutive Saturdays, oldest first, counting what is given. */
const weeksOf = (counts: Array<number>): OrgCalendarData['weeks'] =>
  counts.map((count, index) => ({
    from: new Date(Date.UTC(2026, 7, 2 + 7 * index)),
    to: new Date(Date.UTC(2026, 7, 8 + 7 * index)),
    count,
  }));

const data: OrgCalendarData = {
  login: 'vitest-dev',
  name: 'Vitest',
  count: 'prs_merged',
  weeks: weeksOf([0, 2, 4, 6, 8]),
};

/** @returns The level class each week's cell wears, oldest first. */
const levels = (): Array<string | undefined> =>
  screen
    .getAllByTestId('week')
    .map((cell) => /week-(?<level>\d)/u.exec(cell.getAttribute('class') ?? '')?.groups?.['level']);

describe('test renderOrgCalendarCard', () => {
  it('should draw a cell per week, oldest first', () => {
    document.body.innerHTML = renderOrgCalendarCard(data);

    expect(screen.getAllByTestId('week')).toHaveLength(5);
  });

  it("should heat each week by its count against the busiest week's", () => {
    document.body.innerHTML = renderOrgCalendarCard(data);

    expect(levels()).toStrictEqual(['0', '1', '2', '3', '4']);
  });

  it('should warm a week holding anything, however small against the busiest', () => {
    document.body.innerHTML = renderOrgCalendarCard({ ...data, weeks: weeksOf([1, 3, 8]) });

    // 1 of 8 is an eighth of the way up: it rounds up to the first level, never down to cold
    expect(levels()).toStrictEqual(['1', '2', '4']);
  });

  it('should widen past card_width to keep its headline and foot whole', () => {
    document.body.innerHTML = renderOrgCalendarCard(
      { ...data, weeks: weeksOf(Array.from({ length: 9 }, () => 3)) },
      { card_width: 100 },
    );

    const width = Number(document.querySelector('svg')?.getAttribute('width'));
    expect(width).toBeGreaterThan(100);
    for (const cell of screen.getAllByTestId('week')) {
      expect(Number(cell.getAttribute('width'))).toBeGreaterThan(0);
    }
  });

  it('should leave every cell cold when no week counted anything', () => {
    document.body.innerHTML = renderOrgCalendarCard({ ...data, weeks: weeksOf([0, 0, 0]) });

    expect(levels()).toStrictEqual(['0', '0', '0']);
  });

  it('should lead with the total, what it counts and the weekly average', () => {
    document.body.innerHTML = renderOrgCalendarCard(data);

    expect(screen.getByTestId('total')).toHaveTextContent(exactly('20'));
    expect(screen.getByTestId('summary')).toHaveTextContent(
      exactly('pull requests merged · 4 a week'),
    );
  });

  it.each([
    ['prs_opened', 'pull requests opened'],
    ['issues_opened', 'issues opened'],
    ['issues_closed', 'issues closed'],
  ] as const)('should say what a %s calendar counts', (count, counted) => {
    document.body.innerHTML = renderOrgCalendarCard({ ...data, count });

    expect(screen.getByTestId('summary')).toHaveTextContent(`${counted} ·`);
  });

  it('should word a total of one in the singular', () => {
    document.body.innerHTML = renderOrgCalendarCard({ ...data, weeks: weeksOf([0, 1]) });

    expect(screen.getByTestId('summary')).toHaveTextContent(/^pull request merged ·/u);
  });

  it('should abbreviate the total, and write it out in full when the format is long', () => {
    const busy = { ...data, weeks: weeksOf([700, 650]) };

    document.body.innerHTML = renderOrgCalendarCard(busy);
    expect(screen.getByTestId('total')).toHaveTextContent(exactly('1.4k'));

    document.body.innerHTML = renderOrgCalendarCard(busy, { number_format: 'long' });
    expect(screen.getByTestId('total')).toHaveTextContent(exactly('1350'));
  });

  it('should name the first and last day under the row', () => {
    document.body.innerHTML = renderOrgCalendarCard(data);

    expect(screen.getByTestId('from')).toHaveTextContent(exactly('2026-08-02'));
    expect(screen.getByTestId('to')).toHaveTextContent(exactly('2026-09-05'));
  });

  it('should span the inner width with the row, edge to edge', () => {
    document.body.innerHTML = renderOrgCalendarCard(data);

    const cells = screen.getAllByTestId('week');
    const last = cells.at(-1);
    expect(cells[0]).toHaveAttribute('x', String(CARD_STYLE.padding.x));
    expect(Number(last?.getAttribute('x')) + Number(last?.getAttribute('width'))).toBeCloseTo(
      500 - CARD_STYLE.padding.x,
    );
  });

  it("should paint an empty week in the track, and the hottest in the heat's last stop", () => {
    document.body.innerHTML = renderOrgCalendarCard(data, { theme: 'ember_dark' });

    const colors = getCardColors('ember_dark');
    expect(cssValue('.week-0', 'fill')).toBe(colors.progBarBgColor);
    expect(cssValue('.week-4', 'fill')).toBe(colors.heat[2]);
  });

  it('should keep the levels apart on a one-color heat', () => {
    document.body.innerHTML = renderOrgCalendarCard(data, { theme: 'nord' });

    const opacities = ['.week-1', '.week-2', '.week-3', '.week-4'].map((level) =>
      cssValue(level, 'fill-opacity'),
    );
    expect(new Set(opacities).size).toBe(4);
  });

  it('should name the organization in the title', () => {
    document.body.innerHTML = renderOrgCalendarCard(data);

    expect(document.querySelector('.header')).toHaveTextContent(
      exactly("Vitest's activity, week by week"),
    );
  });

  it("should write each week's count inside its cell", () => {
    document.body.innerHTML = renderOrgCalendarCard(data);

    const counts = screen.getAllByTestId('week-count');
    expect(counts.map((count) => count.textContent)).toStrictEqual(['0', '2', '4', '6', '8']);
    for (const [index, cell] of screen.getAllByTestId('week').entries()) {
      const left = Number(cell.getAttribute('x'));
      const middle = left + Number(cell.getAttribute('width')) / 2;
      expect(Number(counts[index]?.getAttribute('x'))).toBeCloseTo(middle, 1);
    }
  });

  it('should shorten a count its cell cannot hold, down to a power of ten and a plus', () => {
    const counts = [9, 999, 12_345, 123_456, 1_234_567, 3, 3, 3, 3];
    document.body.innerHTML = renderOrgCalendarCard(
      { ...data, weeks: weeksOf(counts) },
      { card_width: 100, number_format: 'long' },
    );

    expect(screen.getAllByTestId('week-count').map((count) => count.textContent)).toStrictEqual([
      '9',
      '999',
      '12k',
      '123k',
      '1M+',
      '3',
      '3',
      '3',
      '3',
    ]);
  });

  it('should write a count in whichever of its text and background reads best on the cell', () => {
    const colors = getCardColors('ember_light');
    document.body.innerHTML = renderOrgCalendarCard(data, { theme: 'ember_light' });

    expect(cssValue('.week-count-0', 'fill')).toBe(colors.textColor);
    expect(cssValue('.week-count-4', 'fill')).toBe(colors.bgColor);
  });

  it('should fall back to white or black where neither theme color reads on the cell', () => {
    // a transparent card stands on either page, so its text color cannot read on its hottest cells
    document.body.innerHTML = renderOrgCalendarCard(data, { theme: 'transparent' });

    expect(cssValue('.week-count-4', 'fill')).toBe('#ffffff');
  });

  it('should keep a small week whole when number_precision would write it as 0k', () => {
    document.body.innerHTML = renderOrgCalendarCard(
      { ...data, weeks: weeksOf([5, 40, 1200]) },
      { number_precision: 0 },
    );

    expect(screen.getAllByTestId('week-count').map((count) => count.textContent)).toStrictEqual([
      '5',
      '40',
      '1k',
    ]);
    expect(document.querySelector('desc')).toHaveTextContent(/Week by week: 5, 40, 1k\.$/u);
  });

  it('should round a shortened count down, never up', () => {
    // two decimals write `1.55k` and `1000.00k`, too wide for these cells
    const counts = [1550, 999_999, 3, 3, 3, 3, 3, 3, 3];
    document.body.innerHTML = renderOrgCalendarCard(
      { ...data, weeks: weeksOf(counts) },
      { card_width: 100, number_precision: 2 },
    );

    const [low, high] = screen.getAllByTestId('week-count').map((count) => count.textContent);
    expect([low, high]).toStrictEqual(['1.5k', '999k']);
  });

  it('should name no span for a card with no weeks', () => {
    document.body.innerHTML = renderOrgCalendarCard({ ...data, weeks: [] });

    expect(screen.queryAllByTestId('week')).toHaveLength(0);
    expect(document.querySelector('desc')).toHaveTextContent(exactly('0 pull requests merged.'));
  });

  it('should repeat what it shows in the accessibility description', () => {
    document.body.innerHTML = renderOrgCalendarCard(data);

    expect(document.querySelector('desc')).toHaveTextContent(
      exactly(
        '20 pull requests merged, 4 a week, from 2026-08-02 to 2026-09-05. Week by week: 0, 2, 4, 6, 8.',
      ),
    );
  });
});
