import { screen } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';

import { Card, titleFits } from '../src/common/Card.ts';
import { getCardColors } from '../src/common/color.ts';
import { icons } from '../src/common/icons.ts';
import { measureText } from '../src/common/text.ts';

import { cssValue, draw, exactly } from './_card.ts';

/** @returns Every `.header` font-size the drawn style sets, in px: the shrink, then Firefox's. */
const headerSizes = (): Array<number> =>
  [
    ...(document.querySelector('style')?.textContent ?? '').matchAll(
      /\.header \{\s*font-size: (?<px>[\d.]+)px;/gu,
    ),
  ].map((match) => Number(match.groups?.['px']));

describe(Card, () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should hide border', () => {
    const card = new Card({});
    card.setHideBorder(true);

    draw(card.render(``));
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('stroke-opacity', '0');
  });

  it('should not hide border', () => {
    const card = new Card({});
    card.setHideBorder(false);

    draw(card.render(``));
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('stroke-opacity', '1');
  });

  it('should have a custom title', () => {
    const card = new Card({
      customTitle: 'custom title',
      defaultTitle: 'default title',
    });

    draw(card.render(``));
    expect(screen.queryByTestId('card-title')).toHaveTextContent(exactly('custom title'));
  });

  it('should set custom title', () => {
    const card = new Card({});
    card.setTitle('custom title');

    draw(card.render(``));
    expect(screen.queryByTestId('card-title')).toHaveTextContent(exactly('custom title'));
  });

  it('should hide title', () => {
    const card = new Card({});
    card.setHideTitle(true);

    draw(card.render(``));
    expect(screen.queryByTestId('card-title')).toBeNull();
  });

  it('should not hide title', () => {
    const card = new Card({});
    card.setHideTitle(false);

    draw(card.render(``));
    expect(screen.queryByTestId('card-title')).toBeInTheDocument();
  });

  it.each([
    { icon: true, room: 225 },
    { icon: false, room: 250 },
  ])(
    'should shrink a title too long for the card to fill its room (icon $icon)',
    ({ icon, room }) => {
      const title = 'Οι περισσότερο χρησιμοποιούμενες γλώσσες';
      const card = new Card({
        width: 300,
        customTitle: title,
        titlePrefixIcon: icon ? icons.repo : undefined,
      });

      draw(card.render(``));
      expect(screen.getByTestId('header')).toHaveTextContent(title);
      expect(screen.getByTestId('header')).not.toHaveAttribute('style');
      const [size = 0, firefox] = headerSizes();
      // The semibold header draws about a tenth wider than `measureText`'s regular widths.
      expect(measureText(title, size) * 1.1).toBeLessThanOrEqual(room);
      expect(measureText(title, size + 0.1) * 1.1).toBeGreaterThan(room);
      // Firefox lays the title out wider, so it keeps the ratio its own 15.5px has to 18px.
      expect(firefox).toBe(Math.floor((size * 15.5 * 10) / 18) / 10);
    },
  );

  it.each([1, 100])('should shrink no smaller than 9px, cropping instead (width %i)', (width) => {
    const card = new Card({ width, customTitle: 'Most Used Languages' });

    draw(card.render(``));
    expect(headerSizes()).toStrictEqual([9, 7.7]);
  });

  it('should leave a title that fits at its own size', () => {
    const card = new Card({ width: 300, customTitle: 'Most Used Languages' });

    draw(card.render(``));
    expect(headerSizes()).toStrictEqual([15.5]);
  });

  it('should count a title as fitting while it shrinks no further than 16px', () => {
    const title = 'Most Used Languages';
    // padding on both sides, the icon's column, then the semibold width at 16px
    const at16 = 50 + 25 + (measureText(title, 18) * 1.1 * 16) / 18;

    expect(titleFits(title, Math.ceil(at16) + 1)).toBe(true);
    expect(titleFits(title, Math.floor(at16) - 1)).toBe(false);
  });

  it('title should have prefix icon', () => {
    const card = new Card({ titlePrefixIcon: icons.repo });

    draw(card.render(``));
    expect(document.querySelector('.title-icon')).toBeInTheDocument();
  });

  it('should band the title, and drop the band along with the title', () => {
    const card = new Card({ width: 200 });

    draw(card.render(``));
    expect(screen.getByTestId('title-band')).toBeInTheDocument();

    card.setHideTitle(true);
    draw(card.render(``));
    expect(screen.queryByTestId('title-band')).not.toBeInTheDocument();
  });

  it('should band the title in the title color and keep the icon out of it', () => {
    const card = new Card({
      titlePrefixIcon: icons.repo,
      colors: {
        light: getCardColors({ title_color: 'f00', icon_color: '0f0', theme: 'default' }),
        dark: null,
      },
    });

    draw(card.render(``));
    expect(cssValue('.title-band', 'fill')).toBe('#f00');
    expect(cssValue('.title-icon', 'fill')).toBe('#0f0');
    expect(cssValue('.title-accent', 'fill')).toBe('#0f0');
  });

  it('should follow the card corners with the band, and square its foot', () => {
    const card = new Card({ width: 200, border_radius: 8 });

    draw(card.render(``));
    // Rounded in at both top corners, then straight down to its foot at 46.
    expect(screen.getByTestId('title-band')).toHaveAttribute(
      'd',
      'M0.5 8.5a8 8 0 0 1 8 -8h183a8 8 0 0 1 8 8v37.5h-199z',
    );
  });

  it('title should not have prefix icon', () => {
    const card = new Card({});

    draw(card.render(``));
    expect(document.querySelector('.title-icon')).not.toBeInTheDocument();
  });

  it('should have proper height, width', () => {
    const card = new Card({ height: 200, width: 200 });
    const svg = draw(card.render(``));
    expect(svg).toHaveAttribute('height', '200');
    expect(svg).toHaveAttribute('width', '200');
  });

  it('should have less height after title is hidden', () => {
    const card = new Card({ height: 200 });
    card.setHideTitle(true);

    expect(draw(card.render(``))).toHaveAttribute('height', '170');
  });

  it('main-card-body should have proper when title is visible', () => {
    const card = new Card({ height: 200 });
    draw(card.render(``));
    expect(screen.queryByTestId('main-card-body')).toHaveAttribute('transform', 'translate(0, 55)');
  });

  it('main-card-body should have proper position after title is hidden', () => {
    const card = new Card({ height: 200 });
    card.setHideTitle(true);

    draw(card.render(``));
    expect(screen.queryByTestId('main-card-body')).toHaveAttribute('transform', 'translate(0, 25)');
  });

  it('should render with correct colors', () => {
    const card = new Card({
      height: 200,
      colors: {
        light: getCardColors({
          title_color: 'f00',
          icon_color: '0f0',
          text_color: '00f',
          bg_color: 'fff',
          theme: 'default',
        }),
        dark: null,
      },
    });
    draw(card.render(``));

    expect(cssValue('.header', 'fill')).toBe('#f00');
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#fff');
  });

  it('should render gradient backgrounds', () => {
    const card = new Card({
      height: 200,
      colors: {
        light: getCardColors({
          title_color: 'f00',
          icon_color: '0f0',
          text_color: '00f',
          bg_color: '90,fff,000,f00',
          theme: 'default',
        }),
        dark: null,
      },
    });
    draw(card.render(``));
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', 'url(#gradient)');
    expect(document.querySelector('defs #gradient')).toHaveAttribute(
      'gradientTransform',
      'rotate(90)',
    );
    expect(document.querySelector('defs #gradient stop:nth-child(1)')).toHaveAttribute(
      'stop-color',
      '#fff',
    );
    expect(document.querySelector('defs #gradient stop:nth-child(2)')).toHaveAttribute(
      'stop-color',
      '#000',
    );
    expect(document.querySelector('defs #gradient stop:nth-child(3)')).toHaveAttribute(
      'stop-color',
      '#f00',
    );
  });
});
