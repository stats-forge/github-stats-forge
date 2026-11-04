import { describe, expect, it } from 'vitest';

import { parseThemeParams } from '../src/api/params.ts';
import {
  HEAT_PAINT,
  cardGround,
  getCardColors,
  getLightDarkColors,
  heatAt,
} from '../src/common/color.ts';
import { CardError } from '../src/common/error.ts';
import { themes } from '../src/themes/index.ts';

describe(getCardColors, () => {
  it("should draw with the theme's own colors", () => {
    const { heat } = themes.cobalt_light;
    expect(getCardColors('cobalt_light')).toStrictEqual({
      heat: [`#${heat[0]}`, `#${heat[1]}`, `#${heat[2]}`],
      titleColor: `#${heat[1]}`,
      iconColor: `#${heat[1]}`,
      textColor: `#${themes.cobalt_light.text_color}`,
      bgColor: `#${themes.cobalt_light.bg_color}`,
      borderColor: `#${heat[1]}4d`,
      ringColor: HEAT_PAINT.ring,
      progBarBgColor: '#ddd',
      glowOpacity: 0.17,
      bandOpacity: 0.1,
    });
  });

  it('should fall back to ember_light for an unknown name, or none', () => {
    expect(getCardColors('invalidTheme')).toStrictEqual(getCardColors('ember_light'));
    expect(getCardColors('toString')).toStrictEqual(getCardColors('ember_light'));
    expect(getCardColors('ember')).toStrictEqual(getCardColors('ember_light'));
    expect(getCardColors()).toStrictEqual(getCardColors('ember_light'));
  });

  it('should keep a border the theme names', () => {
    expect(getCardColors('transparent').borderColor).toBe(`#${themes.transparent.border_color}`);
  });

  it('should glow hotter, and draw a lighter track, on a dark background', () => {
    expect(getCardColors('ember_dark').glowOpacity).toBe(0.42);
    expect(getCardColors('ember_dark').progBarBgColor).toBe('#ffffff33');
    expect(getCardColors('transparent').glowOpacity).toBe(0.25);
    expect(getCardColors('transparent').progBarBgColor).toBe('#8b949e59');
  });
});

describe('quiet themes', () => {
  it('should drop the glow and halve the band, against the same tone in the forge', () => {
    const quiet = getCardColors('classic');
    const forge = getCardColors('ember_light');
    expect(quiet.glowOpacity).toBe(0);
    expect(quiet.bandOpacity).toBeCloseTo(forge.bandOpacity / 2);
    expect(getCardColors('nord').glowOpacity).toBe(0);
  });
});

describe(getLightDarkColors, () => {
  it('should follow the viewer in ember when no theme is named', () => {
    const { lightColors, darkColors } = getLightDarkColors({});
    expect(lightColors).toStrictEqual(getCardColors('ember_light'));
    expect(darkColors).toStrictEqual(getCardColors('ember_dark'));
  });

  it('should carry one palette for one name', () => {
    const { lightColors, darkColors } = getLightDarkColors({ theme: 'brass_dark' });
    expect(lightColors).toStrictEqual(getCardColors('brass_dark'));
    expect(darkColors).toBeNull();
  });

  it('should draw the first of a pair in light mode and the second in dark', () => {
    const { lightColors, darkColors } = getLightDarkColors({ theme: 'cobalt_dark,github_light' });
    expect(lightColors).toStrictEqual(getCardColors('cobalt_dark'));
    expect(darkColors).toStrictEqual(getCardColors('github_light'));
  });

  it('should carry one palette for a pair naming one theme twice', () => {
    expect(getLightDarkColors({ theme: 'verdigris_dark,verdigris_dark' }).darkColors).toBeNull();
  });
});

describe(cardGround, () => {
  it('should name the one background a card stands on, or the viewer when it carries both', () => {
    expect(cardGround({})).toBe('viewer');
    expect(cardGround({ theme: 'brass_light,magma_dark' })).toBe('viewer');
    expect(cardGround({ theme: 'cobalt_dark' })).toBe('dark');
    expect(cardGround({ theme: 'cobalt_light' })).toBe('light');
    expect(cardGround({ theme: 'transparent' })).toBe('translucent');
  });
});

/**
 * @returns The theme the schema yields, or the param it rejected.
 */
const parsedTheme = (theme: string): string | undefined => {
  try {
    return parseThemeParams({ theme }).theme;
  } catch (error) {
    return error instanceof CardError ? `rejected ${String(error.param)}` : undefined;
  }
};

describe(parseThemeParams, () => {
  it('should accept one name or a pair, in the table spelling', () => {
    expect(parsedTheme('Ember_Light')).toBe('ember_light');
    expect(parsedTheme('BRASS_LIGHT, magma_dark')).toBe('brass_light,magma_dark');
  });

  it('should reject an unknown name, or more than two', () => {
    expect(parsedTheme('ember')).toBe('rejected theme');
    expect(parsedTheme('ember_light,nope')).toBe('rejected theme');
    expect(parsedTheme('ember_light,cobalt_dark,brass_dark')).toBe('rejected theme');
  });

  it('should pick only the theme off a query', () => {
    expect(
      parseThemeParams({ theme: 'ember_dark', title_color: 'fff', username: 'x' }),
    ).toStrictEqual({ theme: 'ember_dark' });
  });
});

describe(heatAt, () => {
  const heat: [string, string, string] = ['#000000', '#ffffff', '#ff0000'];

  it('should land on each stop at its offset', () => {
    expect(heatAt(heat, 0)).toBe('#000000');
    expect(heatAt(heat, 0.55)).toBe('#ffffff');
    expect(heatAt(heat, 1)).toBe('#ff0000');
  });

  it('should mix the two stops around it', () => {
    expect(heatAt(heat, 0.275)).toBe('#808080');
    expect(heatAt(heat, 0.775)).toBe('#ff8080');
  });

  it('should expand a shorthand and keep an alpha', () => {
    expect(heatAt(['#f00', '#f000', '#000'], 0.275)).toBe('#ff000080');
  });
});
