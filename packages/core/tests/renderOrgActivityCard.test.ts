import { screen } from '@testing-library/dom';
import { cssToObject } from '@uppercod/css-to-object';
import { describe, expect, it } from 'vitest';

import { renderOrgActivityCard } from '../src/cards/org-activity/index.ts';
import { CardError } from '../src/common/error.ts';
import type { OrgActivityData } from '../src/fetchers/types.ts';
import { themes } from '../src/themes/index.ts';

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

describe('test renderOrgActivityCard', () => {
  it('should draw the four stats it always draws, and no more', () => {
    document.body.innerHTML = renderOrgActivityCard(data);

    expect(screen.queryByTestId('prs_opened')).toHaveTextContent('267');
    expect(screen.queryByTestId('prs_merged')).toHaveTextContent('169');
    expect(screen.queryByTestId('issues_opened')).toHaveTextContent('82');
    expect(screen.queryByTestId('issues_closed')).toHaveTextContent('66');

    expect(screen.queryByTestId('discussions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('commits')).not.toBeInTheDocument();
  });

  it('should draw the extra stats `show` names', () => {
    document.body.innerHTML = renderOrgActivityCard(data, { show: ['discussions', 'commits'] });

    expect(screen.queryByTestId('discussions')).toHaveTextContent('9');
    expect(screen.queryByTestId('commits')).toHaveTextContent('204');
  });

  it('should leave out the stats `hide` names', () => {
    document.body.innerHTML = renderOrgActivityCard(data, {
      hide: ['prs_merged', 'issues_closed'],
    });

    expect(screen.queryByTestId('prs_opened')).toBeInTheDocument();
    expect(screen.queryByTestId('prs_merged')).not.toBeInTheDocument();
    expect(screen.queryByTestId('issues_closed')).not.toBeInTheDocument();
  });

  it('should leave out a commit count nobody fetched, even when `show` names it', () => {
    document.body.innerHTML = renderOrgActivityCard(
      { ...data, commits: null },
      {
        show: ['commits'],
      },
    );

    expect(screen.queryByTestId('commits')).not.toBeInTheDocument();
    expect(screen.queryByTestId('prs_opened')).toBeInTheDocument();
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
      "Vitest's organization activity (last 30 days)",
    );
  });

  it('should write the window in the singular for a window of one day', () => {
    document.body.innerHTML = renderOrgActivityCard({ ...data, days: 1 });

    expect(document.querySelector('.header')).toHaveTextContent('(last 1 day)');
  });

  it('should drop the possessive s from a name that ends in one', () => {
    document.body.innerHTML = renderOrgActivityCard({ ...data, name: 'Rollup Plugins' });

    expect(document.querySelector('.header')).toHaveTextContent(
      "Rollup Plugins' organization activity",
    );
  });

  it('should keep the window when the name makes the title too wide', () => {
    document.body.innerHTML = renderOrgActivityCard({
      ...data,
      name: 'An organization with a name of thirty-nine plus',
    });

    expect(document.querySelector('.header')).toHaveTextContent(
      'Organization activity (last 30 days)',
    );
    expect(document.querySelector('.header')).not.toHaveTextContent('An organization with');
  });

  it('should take a custom title', () => {
    document.body.innerHTML = renderOrgActivityCard(data, { custom_title: 'How we are doing' });

    expect(document.querySelector('.header')).toHaveTextContent('How we are doing');
  });

  it('should give the title icon its own color, and hold its slot either way', () => {
    document.body.innerHTML = renderOrgActivityCard(data);

    const styleTag = document.querySelector('style');
    const iconStyles = cssToObject(styleTag?.innerHTML ?? '')[':host']?.['.title-icon '];

    expect(document.querySelector('.title-icon')).toBeInTheDocument();
    expect(iconStyles?.['fill']?.trim()).toBe(`#${themes.default.icon_color}`);
  });

  it('should abbreviate a count, and write it out in full when the format is long', () => {
    document.body.innerHTML = renderOrgActivityCard({ ...data, prsOpened: 1204 });
    expect(screen.queryByTestId('prs_opened')).toHaveTextContent('1.2k');

    document.body.innerHTML = renderOrgActivityCard(
      { ...data, prsOpened: 1204 },
      { number_format: 'long' },
    );
    expect(screen.queryByTestId('prs_opened')).toHaveTextContent('1204');
  });

  it('should hide the stat icons when asked, without dropping their rows', () => {
    document.body.innerHTML = renderOrgActivityCard(data, { show_icons: false });

    const styleTag = document.querySelector('style');
    const iconStyles = cssToObject(styleTag?.innerHTML ?? '')[':host']?.['.icon '];

    expect(iconStyles?.['display']?.trim()).toBe('none');
    expect(screen.queryByTestId('prs_opened')).toBeInTheDocument();
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
