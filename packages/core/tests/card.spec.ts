import { screen } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';

import { CARD_STYLE } from '../src/common/brand.ts';
import { Card, titleFits } from '../src/common/Card.ts';
import { HEAT_PAINT, getCardColors } from '../src/common/color.ts';
import { icons } from '../src/common/icons.ts';
import { measureText } from '../src/common/text.ts';
import { themes } from '../src/themes/index.ts';

import { cssValue, draw, exactly } from './_card.ts';

/** @returns A card with no title or description of its own, plus whatever `init` sets. */
const blank = (init: Partial<ConstructorParameters<typeof Card>[0]> = {}): Card =>
  new Card({ title: '', description: '', ...init });

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
    const card = blank({ hideBorder: true });

    draw(card.render(``));
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('stroke-opacity', '0');
  });

  it('should not hide border', () => {
    const card = blank({ hideBorder: false });

    draw(card.render(``));
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('stroke-opacity', '1');
  });

  it('should have a custom title', () => {
    const card = blank({
      title: 'custom title',
    });

    draw(card.render(``));
    expect(screen.queryByTestId('card-title')).toHaveTextContent(exactly('custom title'));
  });

  it('should hide title', () => {
    const card = blank({ hideTitle: true });

    draw(card.render(``));
    expect(screen.queryByTestId('card-title')).toBeNull();
  });

  it('should not hide title', () => {
    const card = blank({ hideTitle: false });

    draw(card.render(``));
    expect(screen.queryByTestId('card-title')).toBeInTheDocument();
  });

  it.each([
    { icon: true, room: 300 - 2 * CARD_STYLE.padding.x - 25 },
    { icon: false, room: 300 - 2 * CARD_STYLE.padding.x },
  ])(
    'should shrink a title too long for the card to fill its room (icon $icon)',
    ({ icon, room }) => {
      const title = 'Οι περισσότερο χρησιμοποιούμενες γλώσσες';
      const card = blank({
        width: 300,
        title,
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
    const card = blank({ width, title: 'Most Used Languages' });

    draw(card.render(``));
    expect(headerSizes()).toStrictEqual([9, 7.7]);
  });

  it('should leave a title that fits at its own size', () => {
    const card = blank({ width: 300, title: 'Most Used Languages' });

    draw(card.render(``));
    expect(headerSizes()).toStrictEqual([15.5]);
  });

  it('should count a title as fitting while it shrinks no further than 16px', () => {
    const title = 'Most Used Languages';
    // padding on both sides, the icon's column, then the semibold width at 16px
    const at16 = 2 * CARD_STYLE.padding.x + 25 + (measureText(title, 18) * 1.1 * 16) / 18;

    expect(titleFits(title, Math.ceil(at16) + 1)).toBe(true);
    expect(titleFits(title, Math.floor(at16) - 1)).toBe(false);
  });

  it('title should have prefix icon', () => {
    const card = blank({ titlePrefixIcon: icons.repo });

    draw(card.render(``));
    expect(document.querySelector('.title-icon')).toBeInTheDocument();
  });

  it('should trail the title with the heat, and drop the trail along with the title', () => {
    draw(blank({ width: 200 }).render(``));
    expect(screen.getByTestId('title-accent')).toHaveAttribute('fill', HEAT_PAINT.trail);

    draw(blank({ width: 200, hideTitle: true }).render(``));
    expect(screen.queryByTestId('title-accent')).not.toBeInTheDocument();
  });

  it('should run the trail from under the icon to past the title, inside the card', () => {
    const title = 'Short';
    draw(blank({ width: 400, title, titlePrefixIcon: icons.repo }).render(``));
    const expected = 25 + measureText(title, 18) * 1.1 + 24;
    expect(screen.getByTestId('title-accent')).toHaveAttribute(
      'width',
      String(Math.round(expected * 10) / 10),
    );

    draw(blank({ width: 200, title: 'A title far too long for a card this narrow' }).render(``));
    expect(screen.getByTestId('title-accent')).toHaveAttribute(
      'width',
      String(200 - 2 * CARD_STYLE.padding.x),
    );
  });

  it('should paint the title in the heat, in one color, and keep the icon out of it', () => {
    const card = blank({
      titlePrefixIcon: icons.repo,
      colors: {
        light: { ...getCardColors('ember_light'), titleColor: '#f00', iconColor: '#0f0' },
        dark: null,
      },
    });

    draw(card.render(``));
    // A gradient fill blurs text in WebKit's `<img>`, so the title takes the heat's middle stop.
    expect(cssValue('.header', 'fill')).toBe('#f00');
    expect(cssValue('.title-icon', 'fill')).toBe('#0f0');
  });

  it('should recolor the title in the dark block', () => {
    const light = getCardColors('cobalt_light');
    const dark = getCardColors('cobalt_dark');

    draw(blank({ colors: { light, dark } }).render(``));
    expect(document.querySelector('style')).toHaveTextContent(
      /prefers-color-scheme: dark[^@]*\.header \{\s*fill: #3d8bff;/u,
    );
  });

  it('should glow from the corner in the heat, more strongly on a dark card', () => {
    const light = getCardColors('ember_light');
    const dark = getCardColors('ember_dark');

    draw(blank({ colors: { light, dark } }).render(``));
    expect(screen.getByTestId('card-glow')).toHaveAttribute('fill', 'url(#heat-glow)');
    expect(document.querySelector('#heat-glow .glow-core')).toHaveAttribute(
      'stop-opacity',
      String(light.glowOpacity),
    );
    expect(document.querySelector('style')).toHaveTextContent(
      /prefers-color-scheme: dark[^@]*\.glow-core \{\s*stop-color: #ff7a1a;\s*stop-opacity: 0\.13;/u,
    );
  });

  it('should recolor every heat stop in the dark block, so one gradient serves both', () => {
    const light = getCardColors('cobalt_light');
    const dark = getCardColors('cobalt_dark');

    draw(blank({ colors: { light, dark } }).render(``));
    expect(document.querySelector('#heat .heat-0')).toHaveAttribute('stop-color', '#0891b2');
    expect(document.querySelector('style')).toHaveTextContent(
      /prefers-color-scheme: dark[^@]*\.heat-0 \{\s*stop-color: #7df3ff;/u,
    );
  });

  it('should draw the title band in the heat, its top corners following the card', () => {
    const light = getCardColors('ember_light');
    draw(blank({ width: 200, border_radius: 8, colors: { light, dark: null } }).render(``));

    expect(screen.getByTestId('title-band')).toHaveAttribute('fill', 'url(#heat-band)');
    expect(screen.getByTestId('title-band')).toHaveAttribute(
      'd',
      'M0.5 8.5a8 8 0 0 1 8 -8h183a8 8 0 0 1 8 8v32.5h-199z',
    );
    expect(document.querySelector('#heat-band .band-0')).toHaveAttribute(
      'stop-opacity',
      String(light.bandOpacity),
    );
  });

  it('should keep the band inside corners deeper than the band itself', () => {
    const light = getCardColors('ember_light');
    draw(
      blank({ width: 200, height: 200, border_radius: 60, colors: { light, dark: null } }).render(
        ``,
      ),
    );

    // the sides meet the band's bottom where the 60px arcs reach it, 3.26px in from each edge
    expect(screen.getByTestId('title-band')).toHaveAttribute(
      'd',
      'M3.76 41A60 60 0 0 1 60.5 0.5h79A60 60 0 0 1 196.24 41z',
    );
  });

  it('should keep a corner too round for the card circular, the band following it', () => {
    const light = getCardColors('ember_light');
    draw(
      blank({ width: 100, height: 200, border_radius: 500, colors: { light, dark: null } }).render(
        ``,
      ),
    );

    expect(screen.getByTestId('title-band')).toHaveAttribute(
      'd',
      expect.stringMatching(/^M[\d.]+ 41A49\.5 49\.5 0 0 1 50 0\.5h0A49\.5 49\.5 /u),
    );
    expect(screen.getByTestId('card-bg')).toHaveAttribute('rx', '49.5');
  });

  it('should cap a corner too round for a short card at half its height', () => {
    draw(blank({ width: 400, height: 120, border_radius: 500 }).render(``));

    expect(screen.getByTestId('card-bg')).toHaveAttribute('rx', '59.4');
    expect(screen.getByTestId('title-band')).toHaveAttribute(
      'd',
      expect.stringContaining('A59.4 59.4 '),
    );
  });

  it('should show the band more strongly on a dark card', () => {
    draw(
      blank({
        colors: { light: getCardColors('ember_light'), dark: getCardColors('ember_dark') },
      }).render(``),
    );
    expect(document.querySelector('style')).toHaveTextContent(
      /prefers-color-scheme: dark[^@]*\.band-1 \{\s*stop-color: #ff7a1a;\s*stop-opacity: 0\.08;/u,
    );
  });

  it('should drop the band with the title', () => {
    draw(blank({ hideTitle: true }).render(``));
    expect(screen.queryByTestId('title-band')).not.toBeInTheDocument();
  });

  it('should follow the card corners with the glow', () => {
    draw(blank({ width: 200, border_radius: 8 }).render(``));
    expect(screen.getByTestId('card-glow')).toHaveAttribute('rx', '8');
  });

  it('should define the ring and the bloom only for a card that burns', () => {
    draw(blank().render(``));
    expect(document.querySelector('#heat-ring')).toBeNull();
    expect(document.querySelector('#heat-bloom')).toBeNull();

    draw(blank({ burns: true }).render(``));
    expect(document.querySelector('#heat-ring')).toBeInTheDocument();
    expect(document.querySelector('#heat-bloom')).toBeInTheDocument();
    expect(document.querySelectorAll('#heat-bloom > *')).toHaveLength(1);
  });

  it('title should not have prefix icon', () => {
    const card = blank();

    draw(card.render(``));
    expect(document.querySelector('.title-icon')).not.toBeInTheDocument();
  });

  it('should have proper height, width', () => {
    const card = blank({ height: 200, width: 200 });
    const svg = draw(card.render(``));
    expect(svg).toHaveAttribute('height', '200');
    expect(svg).toHaveAttribute('width', '200');
  });

  it('should have less height after title is hidden', () => {
    const card = blank({ height: 200, hideTitle: true });

    expect(draw(card.render(``))).toHaveAttribute('height', '162');
  });

  it('main-card-body should have proper when title is visible', () => {
    const card = blank({ height: 200 });
    draw(card.render(``));
    expect(screen.queryByTestId('main-card-body')).toHaveAttribute('transform', 'translate(0, 50)');
  });

  it('main-card-body should have proper position after title is hidden', () => {
    const card = blank({ height: 200, hideTitle: true });

    draw(card.render(``));
    expect(screen.queryByTestId('main-card-body')).toHaveAttribute('transform', 'translate(0, 12)');
  });

  it('should render with correct colors', () => {
    const card = blank({
      height: 200,
      colors: {
        light: { ...getCardColors('ember_light'), heat: ['#f00', '#f00', '#f00'], bgColor: '#fff' },
        dark: null,
      },
    });
    draw(card.render(``));

    expect(document.querySelector('#heat .heat-1')).toHaveAttribute('stop-color', '#f00');
    expect(screen.queryByTestId('card-bg')).toHaveAttribute('fill', '#fff');
  });

  it("should fill the background with the dark palette's own inside the dark block", () => {
    draw(
      blank({
        colors: { light: getCardColors('ember_light'), dark: getCardColors('ember_dark') },
      }).render(``),
    );
    expect(document.querySelector('style')?.textContent).toMatch(
      new RegExp(
        `prefers-color-scheme: dark[^@]*\\.card-bg \\{\\s*fill: #${themes.ember_dark.bg_color};`,
        'u',
      ),
    );
  });

  it.each([
    { what: 'a border radius that is not a number', init: { border_radius: Number.NaN } },
    { what: 'a title color', colors: { heat: ['red', 'red', 'red'] as [string, string, string] } },
    { what: 'a border color', colors: { borderColor: 'red' } },
    { what: 'a background color', colors: { bgColor: 'red' } },
  ])('refuses to draw $what it cannot write', ({ init, colors }) => {
    const light = getCardColors('ember_light');
    const card = blank({ ...init, colors: { light: { ...light, ...colors }, dark: null } });

    expect(() => card.render(``)).toThrow(/^Invalid /u);
  });

  it('names the heat stop it cannot write, not the one beside it', () => {
    const light = getCardColors('ember_light');
    const heat: [string, string, string] = ['nope', light.heat[1], light.heat[2]];
    const card = blank({ colors: { light: { ...light, heat }, dark: null } });

    expect(() => card.render(``)).toThrow('Invalid heat color: "nope"');
  });
});
