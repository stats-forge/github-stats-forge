import { describe, expect, it } from 'vitest';

import { parseColorParams } from '../src/api/params.ts';
import {
  BASE_COLOR_KEYS,
  COLOR_PARAM_KEYS,
  HEAT_PAINT,
  THEME_PARAM_KEYS,
  THEME_VARIANTS,
  getCardColors,
  getLightDarkColors,
  isBareHexColor,
  isPrefixedHexColor,
  isValidGradient,
} from '../src/common/color.ts';
import { CardError } from '../src/common/error.ts';

describe(getCardColors, () => {
  it('should return expected values', () => {
    const colors = getCardColors({
      title_color: 'f00',
      text_color: '0f0',
      ring_color: '0000ff',
      icon_color: '00f',
      bg_color: 'fff',
      border_color: 'fff',
      prog_bar_bg_color: 'f0f',
      theme: 'ember_dark',
    });
    expect(colors).toStrictEqual({
      heat: ['#f00', '#f00', '#f00'],
      titleColor: '#f00',
      textColor: '#0f0',
      iconColor: '#00f',
      ringColor: '#0000ff',
      bgColor: '#fff',
      borderColor: '#fff',
      progBarBgColor: '#f0f',
      glowOpacity: 0.17,
    });
  });

  it('should fallback to the theme if a color is invalid', () => {
    const colors = getCardColors({
      title_color: 'invalidcolor',
      text_color: '0f0',
      bg_color: 'fff',
      border_color: 'invalidColor',
      theme: 'cobalt_dark',
    });
    expect(colors).toStrictEqual({
      heat: ['#7df3ff', '#3d8bff', '#8a5cff'],
      titleColor: '#3d8bff',
      textColor: '#0f0',
      iconColor: '#3d8bff',
      ringColor: HEAT_PAINT.ring,
      bgColor: '#fff',
      borderColor: '#3d8bff4d',
      progBarBgColor: '#ddd',
      glowOpacity: 0.17,
    });
  });

  it('should fallback to specified theme colors if is not defined', () => {
    expect(getCardColors({ theme: 'ember_dark' })).toStrictEqual({
      heat: ['#ffd166', '#ff7a1a', '#ff2e63'],
      titleColor: '#ff7a1a',
      textColor: '#f7ede6',
      ringColor: HEAT_PAINT.ring,
      iconColor: '#ff7a1a',
      bgColor: '#16100d',
      borderColor: '#ff7a1a4d',
      progBarBgColor: '#ffffff33',
      glowOpacity: 0.42,
    });
  });

  it('should collapse the heat to the title color, and paint the ring with the heat', () => {
    const colors = getCardColors({ title_color: 'f00', theme: 'ember_dark' });
    expect(colors.heat).toStrictEqual(['#f00', '#f00', '#f00']);
    expect(colors.iconColor).toBe('#f00');
    expect(colors.ringColor).toBe(HEAT_PAINT.ring);
  });

  it('should read a family as its light variant', () => {
    expect(getCardColors({ theme: 'magma' })).toStrictEqual(
      getCardColors({ theme: 'magma_light' }),
    );
  });

  it('should fallback to the default theme if theme is invalid', () => {
    expect(getCardColors({ theme: 'invalidTheme' })).toStrictEqual(
      getCardColors({ theme: 'ember_light' }),
    );
    expect(getCardColors({ theme: 'toString' })).toStrictEqual(
      getCardColors({ theme: 'ember_light' }),
    );
  });

  it('should derive the border from the heat, or from the background when the heat cannot', () => {
    expect(getCardColors({ theme: 'cobalt_light' }).borderColor).toBe('#2b5cff4d');
    // A three-digit title has no room for an alpha byte, so the background decides.
    expect(getCardColors({ title_color: 'f00', bg_color: '0d1117' }).borderColor).toBe('#ffffff26');
    expect(getCardColors({ title_color: 'f00', bg_color: 'ffffff' }).borderColor).toBe('#0000001f');
    // A see-through card cannot know what it sits on.
    expect(getCardColors({ title_color: 'f00', bg_color: 'ffffff00' }).borderColor).toBe(
      '#8b949e59',
    );
    // A gradient is judged by its first stop.
    expect(getCardColors({ title_color: 'f00', bg_color: '90,000000,ffffff' }).borderColor).toBe(
      '#ffffff26',
    );
  });

  it('should glow hotter on a dark background', () => {
    expect(getCardColors({ bg_color: '0d1117' }).glowOpacity).toBe(0.42);
    expect(getCardColors({ bg_color: 'ffffff' }).glowOpacity).toBe(0.17);
    expect(getCardColors({ bg_color: 'ffffff00' }).glowOpacity).toBe(0.25);
  });

  it('should derive the progress track from the background when nothing defines one', () => {
    expect(getCardColors({ bg_color: '0d1117' }).progBarBgColor).toBe('#ffffff33');
    expect(getCardColors({ bg_color: 'ffffff' }).progBarBgColor).toBe('#ddd');
    expect(getCardColors({ bg_color: 'ffffff00' }).progBarBgColor).toBe('#8b949e59');
    expect(getCardColors({ bg_color: '90,000000,ffffff' }).progBarBgColor).toBe('#ffffff33');
    expect(getCardColors({ bg_color: '90,ffffff,000000' }).progBarBgColor).toBe('#ddd');
    expect(getCardColors({ theme: 'ember_dark', prog_bar_bg_color: '333' }).progBarBgColor).toBe(
      '#333',
    );
  });

  it('should keep a border named by the theme or the user', () => {
    expect(getCardColors({ theme: 'ember_dark', border_color: 'f00' }).borderColor).toBe('#f00');
    expect(getCardColors({ theme: 'transparent' }).borderColor).toBe('#8b949e59');
  });
});

describe.each([
  [
    'isPrefixedHexColor',
    isPrefixedHexColor,
    ['#f00', '#ffffff', '#12345678'],
    ['f00', '#red', 'red'],
  ],
  ['isBareHexColor', isBareHexColor, ['f00', 'ffffff', '12345678'], ['#f00', '#red', 'red']],
] as const)('%s', (_name, isColor, valid, invalid) => {
  it.each(valid)('accepts %j', (color) => {
    expect(isColor(color)).toBe(true);
  });

  it.each([...invalid, null, undefined])('rejects %j', (color) => {
    expect(isColor(color)).toBe(false);
  });
});

describe(isValidGradient, () => {
  it.each([
    ['90', 'f00', '0f0'],
    ['45', 'fff', '000', 'abc'],
    ['180', 'ff0000', '00ff00', '0000ff'],
  ])('accepts an angle and its stops (%s, ...)', (...gradient) => {
    expect(isValidGradient(gradient)).toBe(true);
  });

  it.each([
    ['a # prefix', ['90', '#f00', '#0f0']],
    ['a named angle', ['red', 'f00', '0f0']],
    ['too few colors', ['90', 'f00']],
    ['no colors', ['90']],
    ['an empty angle', ['', 'f00', '0f0']],
    ['an invalid color', ['90', 'f00', 'red']],
    ['an infinite angle', ['Infinity', 'f00', '0f0']],
    ['a negative infinite angle', ['-Infinity', 'f00', '0f0']],
    ['a non-numeric angle', ['abc', 'f00', '0f0']],
  ])('rejects %s', (_why, gradient) => {
    expect(isValidGradient(gradient)).toBe(false);
  });
});

describe(getLightDarkColors, () => {
  it('draws both variants of the default family when nothing is named', () => {
    const { lightColors, darkColors } = getLightDarkColors({});
    expect(lightColors).toStrictEqual(getCardColors({ theme: 'ember_light' }));
    expect(darkColors).toStrictEqual(getCardColors({ theme: 'ember_dark' }));
  });

  it('draws both variants of a named family', () => {
    const { lightColors, darkColors } = getLightDarkColors({ theme: 'cobalt', title_color: 'f00' });
    expect(lightColors).toStrictEqual(getCardColors({ theme: 'cobalt_light', title_color: 'f00' }));
    expect(darkColors).toStrictEqual(getCardColors({ theme: 'cobalt_dark', title_color: 'f00' }));
  });

  it('returns darkColors null for a pinned variant and no mode-specific params', () => {
    const { lightColors, darkColors } = getLightDarkColors({
      title_color: 'f00',
      theme: 'cobalt_dark',
    });
    expect(darkColors).toBeNull();
    expect(lightColors.titleColor).toBe('#f00');
    expect(lightColors.bgColor).toBe('#0b1020');
  });

  it('returns darkColors null when both modes name one variant', () => {
    const { darkColors } = getLightDarkColors({
      theme_light: 'brass_dark',
      theme_dark: 'brass_dark',
    });
    expect(darkColors).toBeNull();
  });

  it('wears the variant made for an opaque custom background, and only it', () => {
    const dark = getLightDarkColors({ theme: 'verdigris', bg_color: '000' });
    expect(dark.darkColors).toBeNull();
    expect(dark.lightColors).toStrictEqual(
      getCardColors({ theme: 'verdigris_dark', bg_color: '000' }),
    );

    const light = getLightDarkColors({ bg_color: 'fff' });
    expect(light.darkColors).toBeNull();
    expect(light.lightColors).toStrictEqual(
      getCardColors({ theme: 'ember_light', bg_color: 'fff' }),
    );
  });

  it('keeps following the viewer behind a translucent custom background', () => {
    const { darkColors } = getLightDarkColors({ theme: 'magma', bg_color: 'ffffff00' });
    expect(darkColors).toStrictEqual(getCardColors({ theme: 'magma_dark', bg_color: 'ffffff00' }));
  });

  it('lightColors equal base colors when only dark params are given', () => {
    const { lightColors } = getLightDarkColors({
      theme: 'cobalt_light',
      title_color_dark: '0f0',
    });
    expect(lightColors).toStrictEqual(getCardColors({ theme: 'cobalt_light' }));
  });

  it('lightColors use light-specific color override, darkColors use dark-specific', () => {
    const { lightColors, darkColors } = getLightDarkColors({
      title_color_light: 'f00',
      title_color_dark: '0f0',
    });
    expect(lightColors.titleColor).toBe('#f00');
    expect(darkColors?.titleColor).toBe('#0f0');
  });

  it('mixes two families, each taking the variant for its mode', () => {
    const { lightColors, darkColors } = getLightDarkColors({
      theme_light: 'brass',
      theme_dark: 'magma',
    });
    expect(lightColors).toStrictEqual(getCardColors({ theme: 'brass_light' }));
    expect(darkColors).toStrictEqual(getCardColors({ theme: 'magma_dark' }));
  });

  it('mode-specific params win over general color param', () => {
    const { lightColors, darkColors } = getLightDarkColors({
      title_color: 'f00',
      title_color_light: '0f0',
      title_color_dark: '00f',
    });
    expect(lightColors.titleColor).toBe('#0f0');
    expect(darkColors?.titleColor).toBe('#00f');
  });

  it('general theme param is used as base for both modes', () => {
    const { lightColors, darkColors } = getLightDarkColors({
      theme: 'cobalt_light',
      title_color_dark: '0f0',
    });
    expect(lightColors).toStrictEqual(getCardColors({ theme: 'cobalt_light' }));
    expect(darkColors?.titleColor).toBe('#0f0');
    expect(darkColors?.bgColor).toBe(getCardColors({ theme: 'cobalt_light' }).bgColor);
  });

  it('ring_color_dark can be set independently', () => {
    const { darkColors } = getLightDarkColors({
      title_color_dark: '0f0',
      ring_color_dark: 'f0f',
    });
    expect(darkColors?.titleColor).toBe('#0f0');
    expect(darkColors?.ringColor).toBe('#f0f');
  });

  it('prog_bar_bg_color_dark overrides prog bar color for dark mode', () => {
    const { lightColors, darkColors } = getLightDarkColors({
      prog_bar_bg_color_dark: '333',
    });
    expect(darkColors?.progBarBgColor).toBe('#333');
    expect(lightColors.progBarBgColor).toBe('#ddd'); // default
  });

  it('bg gradient works in dark mode', () => {
    const { darkColors } = getLightDarkColors({ bg_color_dark: '90,f00,0f0' });
    expect(darkColors?.bgColor).toStrictEqual(['90', 'f00', '0f0']);
  });

  it('mode-specific theme and color override general', () => {
    const { lightColors, darkColors } = getLightDarkColors({
      theme: 'verdigris',
      theme_light: 'magma_light',
      theme_dark: 'cobalt',
      title_color: 'f00',
      title_color_light: '0f0',
      title_color_dark: '00f',
    });
    expect(lightColors.titleColor).toBe('#0f0');
    expect(darkColors?.titleColor).toBe('#00f');
    expect(lightColors.bgColor).toBe(getCardColors({ theme: 'magma_light' }).bgColor);
    expect(darkColors?.bgColor).toBe(getCardColors({ theme: 'cobalt_dark' }).bgColor);
  });
});

/**
 * @returns The param the schema rejected, or null when it accepted them all.
 */
const invalidParam = (query: Record<string, string>): string | null => {
  try {
    parseColorParams(query);
    return null;
  } catch (error) {
    return error instanceof CardError ? (error.param ?? null) : null;
  }
};

describe(parseColorParams, () => {
  it('should accept valid colors', () => {
    expect(invalidParam({ title_color: 'f00', text_color: '0f0', bg_color: 'fff' })).toBeNull();
  });

  it('should accept a param that was not sent', () => {
    expect(invalidParam({ bg_color: 'fff' })).toBeNull();
  });

  it('should name the first invalid color', () => {
    expect(invalidParam({ title_color: '0f0', text_color: 'red', bg_color: 'fff' })).toBe(
      'text_color',
    );
  });

  it('should accept a gradient for the background', () => {
    expect(invalidParam({ bg_color: '90,f00,0f0', bg_color_dark: '0,000,111' })).toBeNull();
  });

  it('should reject an invalid gradient', () => {
    expect(invalidParam({ bg_color: 'invalid,f00,0f0' })).toBe('bg_color');
  });

  // only the background is drawn as a gradient; one anywhere else failed the draw itself
  it.each([
    'title_color',
    'text_color',
    'icon_color',
    'border_color',
    'ring_color',
    'prog_bar_bg_color',
    'title_color_dark',
  ])('should reject a gradient as %s', (param) => {
    expect(invalidParam({ [param]: '90,f00,0f0' })).toBe(param);
  });

  it('should check a theme param against the themes rather than as a color', () => {
    expect(invalidParam({ theme: 'ember', theme_dark: 'magma_dark', bg_color: 'fff' })).toBeNull();
    expect(invalidParam({ theme: 'fff' })).toBe('theme');
    expect(invalidParam({ theme_dark: 'not-a-theme' })).toBe('theme_dark');
    expect(invalidParam({ bg_color_dark: 'not-a-color' })).toBe('bg_color_dark');
  });

  it('should pick every accepted param off a query, and nothing else', () => {
    const query = Object.fromEntries(
      COLOR_PARAM_KEYS.map((key) => [key, THEME_PARAM_KEYS.includes(key) ? 'ember' : 'fff']),
    );
    expect(Object.keys(parseColorParams({ ...query, username: 'x' }))).toStrictEqual([
      ...COLOR_PARAM_KEYS,
    ]);
  });
});

describe('color param surface', () => {
  // These names are part of the public URL API: once released they cannot be
  // renamed without breaking existing cards. Pinned deliberately, so adding or
  // removing one has to be an explicit decision rather than a side effect.
  it('accepts exactly these params', () => {
    expect(COLOR_PARAM_KEYS).toStrictEqual([
      'title_color',
      'icon_color',
      'text_color',
      'bg_color',
      'border_color',
      'ring_color',
      'prog_bar_bg_color',
      'theme',
      'title_color_light',
      'icon_color_light',
      'text_color_light',
      'bg_color_light',
      'border_color_light',
      'ring_color_light',
      'prog_bar_bg_color_light',
      'theme_light',
      'title_color_dark',
      'icon_color_dark',
      'text_color_dark',
      'bg_color_dark',
      'border_color_dark',
      'ring_color_dark',
      'prog_bar_bg_color_dark',
      'theme_dark',
    ]);
  });

  it('derives a light and dark variant for every base param', () => {
    for (const key of BASE_COLOR_KEYS) {
      for (const variant of THEME_VARIANTS) {
        expect(COLOR_PARAM_KEYS).toContain(`${key}_${variant}`);
      }
    }
    expect(COLOR_PARAM_KEYS).toHaveLength(BASE_COLOR_KEYS.length * (THEME_VARIANTS.length + 1));
  });
});
