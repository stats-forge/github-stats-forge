import { screen } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';

import { renderGistCard } from '../src/cards/gist/index.ts';
import type { GistData } from '../src/fetchers/types.ts';
import { themes } from '../src/themes/index.ts';

import { cssValue, draw, drawnIds, exactly, noMotionRules } from './_card.ts';

const data: GistData = {
  name: 'test',
  nameWithOwner: 'anuraghazra/test',
  description: 'Small <b>test</b> repository with different Python programs.',
  language: 'Python',
  starsCount: 163,
  forksCount: 19,
};

describe('test renderGistCard', () => {
  it('should render correctly', () => {
    draw(renderGistCard(data));

    const header = document.querySelector('.header');
    expect(header).toHaveTextContent(exactly('test'));
    expect(header).not.toHaveTextContent('anuraghazra');
    expect(document.querySelector('.description')).toHaveTextContent(
      // Between "Python" and "programs" there is a line break caused by: </tspan><tspan dy="1.2em" x="25">
      'Small <b>test</b> repository with different Pythonprograms.',
    );
    expect(screen.queryByTestId('starsCount')).toHaveTextContent(exactly('163'));
    expect(screen.queryByTestId('forksCount')).toHaveTextContent(exactly('19'));
    expect(screen.queryByTestId('lang-name')).toHaveTextContent(exactly('Python'));
    expect(screen.queryByTestId('lang-color')).toHaveAttribute('fill', '#3572A5');
  });

  it('should display username in title if show_owner is true', () => {
    draw(renderGistCard(data, { show_owner: true }));
    expect(document.querySelector('.header')).toHaveTextContent(exactly('anuraghazra/test'));
  });

  it('should trim header if name is too long', () => {
    draw(renderGistCard({ ...data, name: 'some-really-long-repo-name-for-test-purposes' }));
    expect(document.querySelector('.header')).toHaveTextContent(
      exactly('some-really-long-repo-name-for-test...'),
    );
  });

  it('should trim description if description is too long', () => {
    draw(
      renderGistCard({
        ...data,
        description:
          'The quick brown fox jumps over the lazy dog is an English-language pangram—a sentence that contains all of the letters of the English alphabet',
      }),
    );

    const lines = document.querySelectorAll('.description tspan');
    expect(lines[0]).toHaveTextContent(
      exactly('The quick brown fox jumps over the lazy dog is an'),
    );
    expect(lines[1]).toHaveTextContent(
      exactly('English-language pangram—a sentence that contains all of'),
    );
  });

  it('should not trim description if it is short', () => {
    draw(renderGistCard({ ...data, description: 'Small text should not trim' }));
    expect(document.querySelector('.description')).toHaveTextContent(
      exactly('Small text should not trim'),
    );
  });

  it('should render emojis in description', () => {
    draw(
      renderGistCard({
        ...data,
        description: 'This is a test gist description with :heart: emoji.',
      }),
    );
    expect(document.querySelector('.description')).toHaveTextContent(
      exactly('This is a test gist description with ❤️ emoji.'),
    );
  });

  it('should render custom colors properly', () => {
    draw(
      renderGistCard(data, {
        title_color: '5a0',
        icon_color: '1b998b',
        text_color: '9991',
        bg_color: '252525',
      }),
    );

    expect(cssValue('.header', 'fill')).toBe('#5a0');
    expect(cssValue('.description', 'fill')).toBe('#9991');
    expect(cssValue('.icon', 'fill')).toBe('#1b998b');
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#252525');
  });

  it.each(Object.entries(themes))('should render with the %s theme', (theme, colors) => {
    draw(renderGistCard(data, { theme }));

    expect(cssValue('.header', 'fill')).toBe(`#${colors.title_color}`);
    expect(cssValue('.description', 'fill')).toBe(`#${colors.text_color}`);
    expect(cssValue('.icon', 'fill')).toBe(`#${colors.icon_color}`);
    expect([`#${colors.bg_color}`, 'url(#gradient)']).toContain(
      screen.queryByTestId('card-bg')?.getAttribute('fill'),
    );
  });

  it('should render custom colors with themes', () => {
    draw(renderGistCard(data, { title_color: '5a0', theme: 'radical' }));

    expect(cssValue('.header', 'fill')).toBe('#5a0');
    expect(cssValue('.description', 'fill')).toBe(`#${themes.radical.text_color}`);
    expect(cssValue('.icon', 'fill')).toBe(`#${themes.radical.icon_color}`);
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', `#${themes.radical.bg_color}`);
  });

  it('should render custom colors with themes and fallback to default colors if invalid', () => {
    draw(
      renderGistCard(data, {
        title_color: 'invalid color',
        text_color: 'invalid color',
        theme: 'radical',
      }),
    );

    // invalid overrides fall back to the default theme; the un-overridden
    // icon/bg come from the requested `radical` theme
    expect(cssValue('.header', 'fill')).toBe(`#${themes.default.title_color}`);
    expect(cssValue('.description', 'fill')).toBe(`#${themes.default.text_color}`);
    expect(cssValue('.icon', 'fill')).toBe(`#${themes.radical.icon_color}`);
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', `#${themes.radical.bg_color}`);
  });

  it.each([
    { starsCount: 0, forksCount: 19, drawn: ['forksCount'] },
    { starsCount: 1, forksCount: 0, drawn: ['starsCount'] },
    { starsCount: 0, forksCount: 0, drawn: [] },
  ])(
    'should draw a count only when it is not zero ($starsCount stars, $forksCount forks)',
    ({ starsCount, forksCount, drawn }) => {
      draw(renderGistCard({ ...data, starsCount, forksCount }));
      expect(drawnIds(['starsCount', 'forksCount'])).toStrictEqual(drawn);
    },
  );

  it('should render without rounding', () => {
    draw(renderGistCard(data, { border_radius: 0 }));
    expect(document.querySelector('rect')).toHaveAttribute('rx', '0');
    draw(renderGistCard(data));
    expect(document.querySelector('rect')).toHaveAttribute('rx', '8');
  });

  it('should animate by default', () => {
    draw(renderGistCard(data));
    expect(noMotionRules()).toBe(1);
  });

  it('should draw the card with no animation when disable_animations is true', () => {
    draw(renderGistCard(data, { disable_animations: true }));
    expect(noMotionRules()).toBe(2);
  });

  it('should fallback to default description', () => {
    draw(renderGistCard({ ...data, description: null }));
    expect(document.querySelector('.description')).toHaveTextContent(
      exactly('No description provided'),
    );
  });
});
