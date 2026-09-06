import { queryByTestId, screen } from '@testing-library/dom';
import { cssToObject } from '@uppercod/css-to-object';
import { afterEach, describe, expect, it } from 'vitest';

import { Card } from '../src/common/Card.ts';
import { getCardColors } from '../src/common/color.ts';
import { icons } from '../src/common/icons.ts';

describe(Card, () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should hide border', () => {
    const card = new Card({});
    card.setHideBorder(true);

    document.body.innerHTML = card.render(``);
    expect(queryByTestId(document.body, 'card-bg')).toHaveAttribute('stroke-opacity', '0');
  });

  it('should not hide border', () => {
    const card = new Card({});
    card.setHideBorder(false);

    document.body.innerHTML = card.render(``);
    expect(queryByTestId(document.body, 'card-bg')).toHaveAttribute('stroke-opacity', '1');
  });

  it('should have a custom title', () => {
    const card = new Card({
      customTitle: 'custom title',
      defaultTitle: 'default title',
    });

    document.body.innerHTML = card.render(``);
    expect(queryByTestId(document.body, 'card-title')).toHaveTextContent('custom title');
  });

  it('should set custom title', () => {
    const card = new Card({});
    card.setTitle('custom title');

    document.body.innerHTML = card.render(``);
    expect(queryByTestId(document.body, 'card-title')).toHaveTextContent('custom title');
  });

  it('should hide title', () => {
    const card = new Card({});
    card.setHideTitle(true);

    document.body.innerHTML = card.render(``);
    expect(queryByTestId(document.body, 'card-title')).toBeNull();
  });

  it('should not hide title', () => {
    const card = new Card({});
    card.setHideTitle(false);

    document.body.innerHTML = card.render(``);
    expect(queryByTestId(document.body, 'card-title')).toBeInTheDocument();
  });

  it('title should have prefix icon', () => {
    const card = new Card({ titlePrefixIcon: icons.repo });

    document.body.innerHTML = card.render(``);
    expect(document.querySelector('.title-icon')).toBeInTheDocument();
  });

  it('should band the title, and drop the band along with the title', () => {
    const card = new Card({ width: 200 });

    document.body.innerHTML = card.render(``);
    expect(screen.getByTestId('title-band')).toBeInTheDocument();

    card.setHideTitle(true);
    document.body.innerHTML = card.render(``);
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

    document.body.innerHTML = card.render(``);
    const stylesObject = cssToObject(document.querySelector('style')?.innerHTML ?? '');

    expect(stylesObject[':host']?.['.title-band ']?.['fill']?.trim()).toBe('#f00');
    expect(stylesObject[':host']?.['.title-icon ']?.['fill']?.trim()).toBe('#0f0');
    expect(stylesObject[':host']?.['.title-accent ']?.['fill']?.trim()).toBe('#0f0');
  });

  it('should follow the card corners with the band, and square its foot', () => {
    const card = new Card({ width: 200, border_radius: 8 });

    document.body.innerHTML = card.render(``);
    // Rounded in at both top corners, then straight down to its foot at 46.
    expect(screen.getByTestId('title-band')).toHaveAttribute(
      'd',
      'M0.5 8.5a8 8 0 0 1 8 -8h183a8 8 0 0 1 8 8v37.5h-199z',
    );
  });

  it('title should not have prefix icon', () => {
    const card = new Card({});

    document.body.innerHTML = card.render(``);
    expect(document.querySelector('.title-icon')).not.toBeInTheDocument();
  });

  it('should have proper height, width', () => {
    const card = new Card({ height: 200, width: 200 });
    document.body.innerHTML = card.render(``);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('height', '200');
    expect(svg).toHaveAttribute('width', '200');
  });

  it('should have less height after title is hidden', () => {
    const card = new Card({ height: 200 });
    card.setHideTitle(true);

    document.body.innerHTML = card.render(``);
    expect(document.querySelector('svg')).toHaveAttribute('height', '170');
  });

  it('main-card-body should have proper when title is visible', () => {
    const card = new Card({ height: 200 });
    document.body.innerHTML = card.render(``);
    expect(queryByTestId(document.body, 'main-card-body')).toHaveAttribute(
      'transform',
      'translate(0, 55)',
    );
  });

  it('main-card-body should have proper position after title is hidden', () => {
    const card = new Card({ height: 200 });
    card.setHideTitle(true);

    document.body.innerHTML = card.render(``);
    expect(queryByTestId(document.body, 'main-card-body')).toHaveAttribute(
      'transform',
      'translate(0, 25)',
    );
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
    document.body.innerHTML = card.render(``);

    const styleTag = document.querySelector('style');
    const stylesObject = cssToObject(styleTag?.innerHTML ?? '');
    const headerClassStyles = stylesObject[':host']?.['.header '];

    expect(headerClassStyles?.['fill']?.trim()).toBe('#f00');
    expect(queryByTestId(document.body, 'card-bg')).toHaveAttribute('fill', '#fff');
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
    document.body.innerHTML = card.render(``);
    expect(queryByTestId(document.body, 'card-bg')).toHaveAttribute('fill', 'url(#gradient)');
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
