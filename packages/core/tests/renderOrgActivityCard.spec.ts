import { CARD_STYLE } from '@stats-forge/card-kit';
import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import { renderOrgActivityCard } from '../src/cards/org-activity/index.ts';
import { CardError } from '../src/common/error.ts';
import type { OrgActivityData } from '../src/fetchers/org-activity/types.ts';
import { themes } from '../src/themes/index.ts';

import { cssValue, exactly } from './_card.ts';

const data: OrgActivityData = {
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

/** @returns The filled part of a flow row's bar. */
const bar = (flow: string): HTMLElement | null =>
  screen.getByTestId(`${flow}-flow`).querySelector('[data-testid="lang-progress"]');

describe('test renderOrgActivityCard', () => {
  it('should pair the four stats it always draws into two flow rows, and draw no more', () => {
    document.body.innerHTML = renderOrgActivityCard(data);

    expect(screen.getByTestId('prs')).toHaveTextContent(exactly('267 opened · 169 merged'));
    expect(screen.getByTestId('issues')).toHaveTextContent(exactly('82 opened · 66 closed'));
    expect(screen.queryAllByTestId(/^(?:prs|issues)_(?:opened|merged|closed)$/u)).toHaveLength(0);

    expect(screen.queryByTestId('discussions_started')).not.toBeInTheDocument();
    expect(screen.queryByTestId('commits')).not.toBeInTheDocument();
  });

  it('should fill each bar with what was done as a share of what was opened', () => {
    document.body.innerHTML = renderOrgActivityCard(data);

    expect(bar('prs')).toHaveAttribute('width', `${String((169 / 267) * 100)}%`);
    expect(bar('issues')).toHaveAttribute('width', `${String((66 / 82) * 100)}%`);
  });

  it('should fill a bar no further than whole when more was merged than opened', () => {
    document.body.innerHTML = renderOrgActivityCard({ ...data, prsOpened: 120, prsMerged: 169 });

    expect(bar('prs')).toHaveAttribute('width', '100%');
  });

  it('should fill a bar whole when something was merged and nothing opened', () => {
    document.body.innerHTML = renderOrgActivityCard({ ...data, prsOpened: 0, prsMerged: 5 });

    expect(bar('prs')).toHaveAttribute('width', '100%');
  });

  it('should leave a bar at its stub when nothing was opened or merged', () => {
    document.body.innerHTML = renderOrgActivityCard({ ...data, prsOpened: 0, prsMerged: 0 });

    expect(bar('prs')).toHaveAttribute('width', '2%');
  });

  it('should end on the bar of a flow row when that row is the last', () => {
    document.body.innerHTML = renderOrgActivityCard(data);

    expect(document.querySelector('svg')).toHaveAttribute(
      'height',
      String(
        CARD_STYLE.padding.bodyOffsetY +
          CARD_STYLE.flowRow.height +
          CARD_STYLE.flowRow.barY +
          CARD_STYLE.bar.height +
          CARD_STYLE.padding.bottom,
      ),
    );
  });

  it('should measure its height off the flow rows and the plain one under them', () => {
    document.body.innerHTML = renderOrgActivityCard(data, { show: ['commits'] });

    expect(document.querySelector('svg')).toHaveAttribute(
      'height',
      String(
        CARD_STYLE.padding.bodyOffsetY +
          2 * CARD_STYLE.flowRow.height +
          CARD_STYLE.statRowInk +
          CARD_STYLE.padding.bottom,
      ),
    );
  });

  it('should draw the extra stats `show` names', () => {
    document.body.innerHTML = renderOrgActivityCard(data, {
      show: ['discussions_started', 'commits'],
    });

    expect(screen.queryByTestId('discussions_started')).toHaveTextContent(exactly('9'));
    expect(screen.queryByTestId('commits')).toHaveTextContent(exactly('204'));
  });

  it('should leave out the stats `hide` names', () => {
    document.body.innerHTML = renderOrgActivityCard(data, {
      hide: ['prs_merged', 'issues_closed'],
    });

    expect(screen.getByTestId('prs_opened')).toHaveTextContent(exactly('267'));
    expect(screen.getByTestId('issues_opened')).toHaveTextContent(exactly('82'));
    expect(screen.queryByTestId('prs_merged')).not.toBeInTheDocument();
    expect(screen.queryByTestId('issues_closed')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId(/-flow$/u)).toHaveLength(0);
  });

  it('should leave out the issue rows a token was refused', () => {
    document.body.innerHTML = renderOrgActivityCard({
      ...data,
      issuesOpened: null,
      issuesClosed: null,
    });

    expect(screen.queryByTestId('issues')).not.toBeInTheDocument();
    expect(screen.queryByTestId('issues_opened')).not.toBeInTheDocument();
    expect(screen.queryByTestId('issues_closed')).not.toBeInTheDocument();
    expect(screen.getByTestId('prs')).toHaveTextContent(exactly('267 opened · 169 merged'));
  });

  it('should leave out a commit count nobody fetched, even when `show` names it', () => {
    document.body.innerHTML = renderOrgActivityCard(
      { ...data, commits: null },
      {
        show: ['commits'],
      },
    );

    expect(screen.queryByTestId('commits')).not.toBeInTheDocument();
    expect(screen.getByTestId('prs')).toBeInTheDocument();
  });

  it('should refuse to draw a card with every stat hidden', () => {
    expect(() =>
      renderOrgActivityCard(data, {
        hide: ['prs_opened', 'prs_merged', 'issues_opened', 'issues_closed'],
      }),
    ).toThrow(CardError);
  });

  it('should name the organization and its window in the title', () => {
    document.body.innerHTML = renderOrgActivityCard(data);

    expect(document.querySelector('.header')).toHaveTextContent(
      exactly("Vitest's organization activity (last 30 days)"),
    );
  });

  it('should write a from/to window as the range it covers', () => {
    document.body.innerHTML = renderOrgActivityCard({
      ...data,
      days: undefined,
      range: { from: new Date('2024-01-01T00:00:00Z'), to: new Date('2024-12-31T23:59:59Z') },
    });

    expect(document.querySelector('.header')).toHaveTextContent('(2024)');
  });

  it('should write the window in the singular for a window of one day', () => {
    document.body.innerHTML = renderOrgActivityCard({ ...data, days: 1 });

    expect(document.querySelector('.header')).toHaveTextContent('(last 1 day)');
  });

  it('should drop the possessive s from a name that ends in one', () => {
    document.body.innerHTML = renderOrgActivityCard({ ...data, name: 'Rollups' });

    expect(document.querySelector('.header')).toHaveTextContent("Rollups' organization activity");
  });

  it('should keep the window when the name makes the title too wide', () => {
    document.body.innerHTML = renderOrgActivityCard({
      ...data,
      name: 'An organization with a name of thirty-nine plus',
    });

    expect(document.querySelector('.header')).toHaveTextContent(
      exactly('Organization activity (last 30 days)'),
    );
    expect(document.querySelector('.header')).not.toHaveTextContent('An organization with');
  });

  it('should take a custom title', () => {
    document.body.innerHTML = renderOrgActivityCard(data, { title: 'How we are doing' });

    expect(document.querySelector('.header')).toHaveTextContent(exactly('How we are doing'));
  });

  it('should give the title icon its own color, and hold its slot either way', () => {
    document.body.innerHTML = renderOrgActivityCard(data);

    expect(document.querySelector('.title-icon')).toBeInTheDocument();
    expect(cssValue('.title-icon', 'fill')).toBe(`#${themes.ember_light.heat[1]}`);
  });

  it('should abbreviate a count, and write it out in full when the format is long', () => {
    document.body.innerHTML = renderOrgActivityCard({ ...data, prsOpened: 1204 });
    expect(screen.getByTestId('prs')).toHaveTextContent(exactly('1.2k opened · 169 merged'));

    document.body.innerHTML = renderOrgActivityCard(
      { ...data, prsOpened: 1204 },
      { number_format: 'long' },
    );
    expect(screen.getByTestId('prs')).toHaveTextContent(exactly('1204 opened · 169 merged'));
  });

  it('should hide the stat icons when asked, without dropping their rows', () => {
    document.body.innerHTML = renderOrgActivityCard(data, { show_icons: false });

    expect(cssValue('.icon', 'display')).toBe('none');
    expect(screen.getByTestId('prs')).toBeInTheDocument();
  });

  it('should repeat every drawn stat in the accessibility description', () => {
    document.body.innerHTML = renderOrgActivityCard(data, { show: ['commits'] });

    const desc = document.querySelector('desc');
    expect(desc).toHaveTextContent('PRs opened: 267');
    expect(desc).toHaveTextContent('Issues closed: 66');
    expect(desc).toHaveTextContent('Commits: 204');
    expect(desc).not.toHaveTextContent('Discussions opened');
  });
});
