import { screen } from '@testing-library/dom';
import { cssToObject } from '@uppercod/css-to-object';
import { describe, expect, it } from 'vitest';

import { pin as pinApi } from '../src/api/pin.ts';
import { renderRepoCard } from '../src/cards/repo/index.ts';
import { repoCardLocales } from '../src/cards/repo/locales.ts';
import { measureText } from '../src/common/text.ts';
import type { RepositoryData } from '../src/fetchers/types.ts';
import { themes } from '../src/themes/index.ts';

import { testConfig } from './_config.ts';

const data_repo: { repository: RepositoryData } = {
  repository: {
    nameWithOwner: 'anuraghazra/convoychat',
    name: 'convoychat',
    description: 'Help us take over the world! React + TS + GraphQL Chat App',
    primaryLanguage: {
      color: '#2b7489',
      id: 'MDg6TGFuZ3VhZ2UyODc=',
      name: 'TypeScript',
    },
    isPrivate: false,
    isArchived: false,
    isTemplate: false,
    stargazerCount: 38_000,
    forkCount: 100,
  },
};

/**
 * The reduced-motion media block carries the same declaration as the unconditional rule, so
 * finding it at all proves nothing about the option.
 *
 * @returns 1 when only reduced-motion stops the animation, 2 when the card stops it outright.
 */
const noMotionRules = (): number =>
  (document.querySelector('style')?.innerHTML.split('animation-duration: 0s !important').length ??
    1) - 1;

// Semibold Helvetica Neue measured 1.097 times `measureText` in Chromium.
const ink = (text: string): number => measureText(text, 12) * 1.1;
const translateX = (node: Element | null): number =>
  Number(
    /translate\((?<x>[\d.-]+)/.exec(node?.getAttribute('transform') ?? '')?.groups?.['x'] ?? 0,
  );

describe('Test renderRepoCard', () => {
  it('should render correctly', () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository);

    const header = document.querySelector('.header');

    expect(header).toHaveTextContent('convoychat');
    expect(header).not.toHaveTextContent('anuraghazra');
    expect(document.querySelector('.description')).toHaveTextContent(
      // no space between "Chat" and "App" because there's a line break there
      'Help us take over the world! React + TS + GraphQL ChatApp',
    );
    expect(screen.queryByTestId('stargazers')).toHaveTextContent('38k');
    expect(screen.queryByTestId('forkcount')).toHaveTextContent('100');
    expect(screen.queryByTestId('lang-name')).toHaveTextContent('TypeScript');
    expect(screen.queryByTestId('lang-color')).toHaveAttribute('fill', '#2b7489');
  });

  it('should display username in title (full repo name)', () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      show_owner: true,
    });
    expect(document.querySelector('.header')).toHaveTextContent('anuraghazra/convoychat');
  });

  it('should trim header', () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      name: 'some-really-long-repo-name-for-test-purposes',
    });

    expect(document.querySelector('.header')).toHaveTextContent(
      'some-really-long-repo-name-for-test...',
    );
  });

  it('should trim description', () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      description:
        'The quick brown fox jumps over the lazy dog is an English-language pangram—a sentence that contains all of the letters of the English alphabet',
    });

    const lines = document.querySelectorAll('.description tspan');
    expect(lines[0]).toHaveTextContent('The quick brown fox jumps over the lazy dog is an');
    expect(lines[1]).toHaveTextContent('English-language pangram—a sentence that contains all of');

    // Should not trim
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      description: 'Small text should not trim',
    });

    expect(document.querySelector('.description')).toHaveTextContent('Small text should not trim');
  });

  it('should render emojis', () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      description: 'This is a text with a :poop: poo emoji',
    });

    // poop emoji may not show in all editors but it's there between "a" and "poo"
    expect(document.querySelector('.description')).toHaveTextContent(
      'This is a text with a 💩 poo emoji',
    );
  });

  it('should hide language if primaryLanguage is null & fallback to correct values', () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      primaryLanguage: null,
    });

    expect(screen.queryByTestId('primary-lang')).toBeNull();

    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      primaryLanguage: { color: null, name: null },
    });

    expect(screen.queryByTestId('primary-lang')).toBeInTheDocument();
    expect(screen.queryByTestId('lang-color')).toHaveAttribute('fill', '#333');

    expect(screen.queryByTestId('lang-name')).toHaveTextContent('Unspecified');
  });

  it('should render default colors properly', () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository);

    const styleTag = document.querySelector('style');
    const stylesObject = cssToObject(styleTag?.innerHTML ?? '');

    const host = stylesObject[':host'];
    const headerClassStyles = host?.['.header '];
    const descClassStyles = host?.['.description '];
    const iconClassStyles = host?.['.icon '];

    expect(headerClassStyles?.['fill']?.trim()).toBe('#2f80ed');
    expect(descClassStyles?.['fill']?.trim()).toBe('#434d58');
    expect(iconClassStyles?.['fill']?.trim()).toBe('#586069');
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#fffefe');
  });

  it('should render custom colors properly', () => {
    const customColors = {
      title_color: '5a0',
      icon_color: '1b998b',
      text_color: '9991',
      bg_color: '252525',
    };

    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      ...customColors,
    });

    const styleTag = document.querySelector('style');
    const stylesObject = cssToObject(styleTag?.innerHTML ?? '');

    const host = stylesObject[':host'];
    const headerClassStyles = host?.['.header '];
    const descClassStyles = host?.['.description '];
    const iconClassStyles = host?.['.icon '];

    const { title_color, text_color, icon_color } = customColors;

    expect(headerClassStyles?.['fill']?.trim()).toBe(`#${title_color}`);
    expect(descClassStyles?.['fill']?.trim()).toBe(`#${text_color}`);
    expect(iconClassStyles?.['fill']?.trim()).toBe(`#${icon_color}`);
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#252525');
  });

  it('should render with all the themes', () => {
    for (const [name, themeData] of Object.entries(themes)) {
      document.body.innerHTML = renderRepoCard(data_repo.repository, {
        theme: name,
      });

      const styleTag = document.querySelector('style');
      const stylesObject = cssToObject(styleTag?.innerHTML ?? '');

      const host = stylesObject[':host'];
      const headerClassStyles = host?.['.header '];
      const descClassStyles = host?.['.description '];
      const iconClassStyles = host?.['.icon '];

      const { title_color, text_color, icon_color, bg_color } = themeData;

      expect(headerClassStyles?.['fill']?.trim()).toBe(`#${title_color}`);
      expect(descClassStyles?.['fill']?.trim()).toBe(`#${text_color}`);
      expect(iconClassStyles?.['fill']?.trim()).toBe(`#${icon_color}`);

      const backgroundElement = screen.queryByTestId('card-bg');
      const backgroundElementFill = backgroundElement?.getAttribute('fill');
      expect([`#${bg_color}`, 'url(#gradient)']).toContain(backgroundElementFill);
    }
  });

  it('should render custom colors with themes', () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      title_color: '5a0',
      theme: 'radical',
    });

    const styleTag = document.querySelector('style');
    const stylesObject = cssToObject(styleTag?.innerHTML ?? '');

    const host = stylesObject[':host'];
    const headerClassStyles = host?.['.header '];
    const descClassStyles = host?.['.description '];
    const iconClassStyles = host?.['.icon '];

    expect(headerClassStyles?.['fill']?.trim()).toBe('#5a0');
    expect(descClassStyles?.['fill']?.trim()).toBe(`#${themes.radical.text_color}`);
    expect(iconClassStyles?.['fill']?.trim()).toBe(`#${themes.radical.icon_color}`);
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', `#${themes.radical.bg_color}`);
  });

  it('should render custom colors with themes and fallback to default colors if invalid', () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      title_color: 'invalid color',
      text_color: 'invalid color',
      theme: 'radical',
    });

    const styleTag = document.querySelector('style');
    const stylesObject = cssToObject(styleTag?.innerHTML ?? '');

    const host = stylesObject[':host'];
    const headerClassStyles = host?.['.header '];
    const descClassStyles = host?.['.description '];
    const iconClassStyles = host?.['.icon '];

    // invalid overrides fall back to the default theme; the un-overridden
    // icon/bg come from the requested `radical` theme
    const { title_color, text_color } = themes.default;
    const { icon_color, bg_color } = themes.radical;

    expect(headerClassStyles?.['fill']?.trim()).toBe(`#${title_color}`);
    expect(descClassStyles?.['fill']?.trim()).toBe(`#${text_color}`);
    expect(iconClassStyles?.['fill']?.trim()).toBe(`#${icon_color}`);
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', `#${bg_color}`);
  });

  it('should not render star count or fork count if either of the are zero', () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      stargazerCount: 0,
    });

    expect(screen.queryByTestId('stargazers')).toBeNull();
    expect(screen.queryByTestId('forkcount')).toBeInTheDocument();

    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      stargazerCount: 1,
      forkCount: 0,
    });

    expect(screen.queryByTestId('stargazers')).toBeInTheDocument();
    expect(screen.queryByTestId('forkcount')).toBeNull();

    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      stargazerCount: 0,
      forkCount: 0,
    });

    expect(screen.queryByTestId('stargazers')).toBeNull();
    expect(screen.queryByTestId('forkcount')).toBeNull();
  });

  it('should render badges', () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      isArchived: true,
    });

    expect(screen.queryByTestId('badge')).toHaveTextContent('Archived');

    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      isTemplate: true,
    });
    expect(screen.queryByTestId('badge')).toHaveTextContent('Template');
  });

  it('should not render template', () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
    });
    expect(screen.queryByTestId('badge')).toBeNull();
  });

  it('should render translated badges', () => {
    document.body.innerHTML = renderRepoCard(
      {
        ...data_repo.repository,
        isArchived: true,
      },
      {
        locale: 'cn',
      },
    );

    expect(screen.queryByTestId('badge')).toHaveTextContent('已归档');

    document.body.innerHTML = renderRepoCard(
      {
        ...data_repo.repository,
        isTemplate: true,
      },
      {
        locale: 'cn',
      },
    );
    expect(screen.queryByTestId('badge')).toHaveTextContent('模板');
  });

  it('should render without rounding', () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      border_radius: 0,
    });
    expect(document.querySelector('rect')).toHaveAttribute('rx', '0');
    document.body.innerHTML = renderRepoCard(data_repo.repository, {});
    expect(document.querySelector('rect')).toHaveAttribute('rx', '8');
  });

  it('should animate by default', () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository);

    expect(noMotionRules()).toBe(1);
  });

  it('should draw the card with no animation when disable_animations is true', () => {
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      disable_animations: true,
    });

    expect(noMotionRules()).toBe(2);
  });

  it('should fallback to default description', () => {
    document.body.innerHTML = renderRepoCard({
      ...data_repo.repository,
      description: null,
      isArchived: true,
    });
    expect(document.querySelector('.description')).toHaveTextContent('No description provided');
  });

  it('should have correct height with specified `description_lines_count` parameter', () => {
    // Testing short description
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      description_lines_count: 1,
    });
    expect(document.querySelector('svg')).toHaveAttribute('height', '120');
    document.body.innerHTML = renderRepoCard(data_repo.repository, {
      description_lines_count: 3,
    });
    expect(document.querySelector('svg')).toHaveAttribute('height', '150');

    // Testing long description
    const longDescription =
      "A tool that will make a lot of iPhone/iPad developers' life easier. It shares your app over-the-air in a WiFi network. Bonjour is used and no configuration is needed.";
    document.body.innerHTML = renderRepoCard(
      { ...data_repo.repository, description: longDescription },
      {
        description_lines_count: 3,
      },
    );
    expect(document.querySelector('svg')).toHaveAttribute('height', '150');
    document.body.innerHTML = renderRepoCard(
      { ...data_repo.repository, description: longDescription },
      {
        description_lines_count: 1,
      },
    );
    expect(document.querySelector('svg')).toHaveAttribute('height', '120');
  });

  describe('every `show` stat at once', () => {
    const showStats = renderRepoCard.OPTIONS.show;
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
      ...data_repo.repository,
      totalPRsAuthored: 1_234_567,
      totalPRsCommented: 4_567_890,
      totalPRsReviewed: 9876,
      totalIssuesAuthored: 321,
      totalIssuesCommented: 9_999_999,
    };

    it.each(locales)('keeps labels clear of values (%s)', (locale) => {
      document.body.innerHTML = renderRepoCard(repository, {
        show: [...showStats],
        locale,
        number_format: 'long',
      });

      const card = document.querySelector('svg');
      expect(card).toHaveAttribute('width', '500');

      const rows = showStats.map((id) => {
        const value = screen.getByTestId(id);
        const row = value.closest('.stagger');
        // `-3` is the stats group, `25` the row's own offset.
        const x = -3 + translateX(row?.parentElement ?? null) + 25;
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
        expect(row.valueRight).toBeLessThanOrEqual(500 - 25);
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

describe('test pin API', () => {
  it('should return a permanent error for an invalid color parameter', async () => {
    const result = await pinApi(
      {
        username: 'user',
        repo: 'repo',
        title_color: 'not-a-color',
      },
      testConfig,
    );

    expect(result.status).toBe('error');
    expect(result.content).toContain(`Invalid color input for parameter &#34;title_color&#34;`);
  });
});
