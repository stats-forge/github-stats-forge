import { DEFAULT_THEME_FAMILY, isThemeFamily, isThemeName, themes } from '../themes/index.ts';
import type { Theme } from '../themes/index.ts';

/** Matches a 3-, 4-, 6-, or 8-digit hex color with no leading `#`. */
const HEX_COLOR = /^(?<digits>[A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{3})$/;

/**
 * Checks if a value is a bare hex color, i.e. hex digits with no `#` prefix
 * (`"f00"`, `"ffffff"`). This is the form user-supplied color params and
 * gradient stops arrive in.
 *
 * @returns True if the value is a bare hex color.
 */
const isBareHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_COLOR.test(value);

/**
 * Checks if a value is a `#`-prefixed hex color (`"#f00"`, `"#ffffff"`). This
 * is the form colors take once resolved by {@link getCardColors}, i.e. right
 * before they are written into the SVG.
 *
 * @returns True if the value is a `#`-prefixed hex color.
 */
const isPrefixedHexColor = (value: unknown): boolean =>
  typeof value === 'string' && value.startsWith('#') && HEX_COLOR.test(value.slice(1));

/**
 * Checks if the given parts form a valid gradient: a finite numeric angle
 * followed by at least two bare-hex color stops, e.g. `["90", "f00", "0f0"]`.
 * The angle is written into the SVG `gradientTransform="rotate(...)"`.
 *
 * @returns True if the parts form a valid gradient.
 */
const isValidGradient = (parts: Array<string>): boolean => {
  const [angle, ...stops] = parts;
  return (
    stops.length >= 2 &&
    angle !== undefined &&
    angle.trim() !== '' &&
    Number.isFinite(Number(angle)) &&
    stops.every((stop) => isBareHexColor(stop))
  );
};

/**
 * Only the background is drawn as a gradient; every other color is one hex value.
 *
 * @returns Whether `color` is a bare hex color or a gradient.
 */
const isValidBackground = (color: string): boolean =>
  isValidGradient(color.split(',')) || isBareHexColor(color);

/** @returns `color` as a `#`-prefixed hex color, or `fallback` when it is not a hex color. */
const solidColor = (color: string | undefined, fallback: string): string => {
  if (isBareHexColor(color)) {
    return `#${color}`;
  }
  return fallback;
};

/** @returns `color` as a gradient's parts or a `#`-prefixed hex color, else `fallback`. */
const backgroundColor = (color: string | undefined, fallback: string): string | Array<string> => {
  const parts = color?.split(',') ?? [];
  if (isValidGradient(parts)) {
    return parts;
  }
  return solidColor(color, fallback);
};

/** Border a light background gets when neither the user nor the theme names one. */
const LIGHT_BG_BORDER = '#0000001f';
/** Border a dark background gets when neither the user nor the theme names one. */
const DARK_BG_BORDER = '#ffffff26';
/** Border a see-through background gets: neutral, since the page behind it decides the contrast. */
const TRANSLUCENT_BG_BORDER = '#8b949e59';

/**
 * @returns Its `[r, g, b, a]` channels, each on 0–1.
 */
const hexChannels = (hex: string): [number, number, number, number] => {
  const digits = hex.slice(1);
  const expanded = digits.length <= 4 ? [...digits].map((digit) => digit + digit).join('') : digits;
  const channel = (index: number): number =>
    Number.parseInt(expanded.slice(index * 2, index * 2 + 2), 16) / 255;

  return [channel(0), channel(1), channel(2), expanded.length === 8 ? channel(3) : 1];
};

type BackgroundTone = 'light' | 'dark' | 'translucent';

/**
 * @returns Whether the background reads light, dark, or lets the page behind it show through.
 */
const backgroundTone = (bgColor: string | Array<string>): BackgroundTone => {
  // A gradient is judged by its first stop.
  const hex = typeof bgColor === 'string' ? bgColor : `#${bgColor[1] ?? ''}`;
  if (!isPrefixedHexColor(hex)) {
    return 'light';
  }

  const [r, g, b, a] = hexChannels(hex);
  if (a < 0.5) {
    return 'translucent';
  }

  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5 ? 'dark' : 'light';
};

const BORDER_BY_TONE: Readonly<Record<BackgroundTone, string>> = {
  light: LIGHT_BG_BORDER,
  dark: DARK_BG_BORDER,
  translucent: TRANSLUCENT_BG_BORDER,
};

/** A progress bar's empty track, as bright as `#ddd` is dark on a light card. */
const PROG_BAR_BG_BY_TONE: Readonly<Record<BackgroundTone, string>> = {
  light: '#ddd',
  dark: '#ffffff33',
  translucent: '#8b949e59',
};

/**
 * Derives a border from the background, so a dark card never gets a light hairline.
 *
 * @returns A translucent `#`-prefixed hex border color.
 */
const borderColorFor = (bgColor: string | Array<string>): string =>
  BORDER_BY_TONE[backgroundTone(bgColor)];

/**
 * Resolved card colors for a single color scheme, as written into the SVG.
 */
interface CardColors {
  /** The heat gradient's stops, brightest first; `title_color` sets all three to itself. */
  heat: [string, string, string];
  /** The heat's middle stop, where a card wants its accent as one color. */
  titleColor: string;
  /** Card icon color. */
  iconColor: string;
  /** Card text color. */
  textColor: string;
  /** Card background color, or a gradient as `[angle, ...stops]`. */
  bgColor: string | Array<string>;
  /** Card border color. */
  borderColor: string;
  /** Stats card rank ring paint: `ring_color`, else {@link HEAT_PAINT}'s ring gradient. */
  ringColor: string;
  /** Progress bar background color. */
  progBarBgColor: string;
  /** How strongly the corner glow shows, on 0–1. */
  glowOpacity: number;
}

/** The ids `Card` defines its heat gradients under, so a card can paint with one. */
const HEAT_ID = {
  line: 'heat',
  ring: 'heat-ring',
  trail: 'heat-trail',
  glow: 'heat-glow',
  bloom: 'heat-bloom',
} as const;

/** The heat gradients as paints, for a `fill` or a `stroke`. */
const HEAT_PAINT = {
  line: `url(#${HEAT_ID.line})`,
  ring: `url(#${HEAT_ID.ring})`,
  trail: `url(#${HEAT_ID.trail})`,
  /** A `filter`, not a paint. */
  bloom: `url(#${HEAT_ID.bloom})`,
} as const;

/** A dark card glows hotter: the same opacity on a light one would tint the whole card. */
const GLOW_OPACITY_BY_TONE: Readonly<Record<BackgroundTone, number>> = {
  light: 0.17,
  dark: 0.42,
  translucent: 0.25,
};

/** `4d` of `ff`: the border is the heat's middle stop at this alpha. */
const HEAT_BORDER_ALPHA = '4d';

/**
 * Every color param a card accepts, before any `_light` / `_dark` suffix.
 *
 * Single source of truth: the param types and {@link COLOR_PARAM_KEYS} are all
 * derived from this, so adding a param here is enough.
 */
const BASE_COLOR_KEYS = [
  'title_color',
  'icon_color',
  'text_color',
  'bg_color',
  'border_color',
  'ring_color',
  'prog_bar_bg_color',
  'theme',
] as const;

const THEME_VARIANTS = ['light', 'dark'] as const;

type BaseColorKey = (typeof BASE_COLOR_KEYS)[number];
type ThemeVariant = (typeof THEME_VARIANTS)[number];

/**
 * Object with all input color params. Not every field is consumed by every card
 * (e.g. `prog_bar_bg_color` is only used by the top-languages card's `normal`
 * layout).
 */
type ColorInput = Partial<Record<BaseColorKey, string | undefined>>;

/** @returns The theme a name selects: a variant as named, a family as its light variant. */
const resolveTheme = (name: string | undefined): Theme | undefined => {
  if (isThemeName(name)) {
    return themes[name];
  }
  if (isThemeFamily(name)) {
    return themes[`${name}_light`];
  }
  return undefined;
};

/**
 * Returns theme based colors with proper overrides and defaults.
 *
 * @returns Card colors.
 */
const getCardColors = ({
  title_color,
  text_color,
  icon_color,
  bg_color,
  border_color,
  ring_color,
  prog_bar_bg_color,
  theme,
}: ColorInput): CardColors => {
  const defaultTheme = themes[`${DEFAULT_THEME_FAMILY}_light`];
  const selectedTheme = resolveTheme(theme) ?? defaultTheme;

  const themeBorderColor = 'border_color' in selectedTheme ? selectedTheme.border_color : undefined;

  // Each color is the user's, else the selected theme's, else the default theme's.
  const customTitle = solidColor(title_color, '');
  const heat: CardColors['heat'] =
    customTitle === ''
      ? [`#${selectedTheme.heat[0]}`, `#${selectedTheme.heat[1]}`, `#${selectedTheme.heat[2]}`]
      : [customTitle, customTitle, customTitle];
  const [, titleColor] = heat;
  const iconColor = solidColor(icon_color, titleColor);
  const textColor = solidColor(
    text_color || selectedTheme.text_color,
    `#${defaultTheme.text_color}`,
  );
  const bgColor = backgroundColor(bg_color || selectedTheme.bg_color, `#${defaultTheme.bg_color}`);
  const tone = backgroundTone(bgColor);

  const heatBorder = titleColor.length === 7 ? `${titleColor}${HEAT_BORDER_ALPHA}` : undefined;
  const borderColor = solidColor(
    border_color || themeBorderColor,
    heatBorder ?? borderColorFor(bgColor),
  );
  const ringColor = solidColor(ring_color, HEAT_PAINT.ring);
  // No theme defines `prog_bar_bg_color`, so it follows the background, as the border does.
  const progBarBgColor = solidColor(prog_bar_bg_color, PROG_BAR_BG_BY_TONE[tone]);

  return {
    heat,
    titleColor,
    iconColor,
    textColor,
    bgColor,
    borderColor,
    ringColor,
    progBarBgColor,
    glowOpacity: GLOW_OPACITY_BY_TONE[tone],
  };
};

type LightDarkColorParams = Partial<Record<`${BaseColorKey}_${ThemeVariant}`, string | undefined>>;

/**
 * Returns the light- or dark-mode-specific color params, given a set of
 * raw query params. Also removes the "_light" or "_dark" suffixes.
 *
 * @returns ColorInput with the suffix stripped, ready for `getCardColors`.
 */
const extractLightDarkColors = (
  params: LightDarkColorParams,
  suffix: `_${ThemeVariant}`,
): ColorInput => {
  const colors: ColorInput = {};
  for (const key of BASE_COLOR_KEYS) {
    const value = params[`${key}${suffix}`];
    if (value !== undefined) {
      colors[key] = value;
    }
  }
  return colors;
};

/**
 * Every suffixed key, so asking "any per-scheme colors at all?" is one pass over names,
 * not two objects built to be thrown away.
 */
const MODE_OVERRIDE_KEYS: ReadonlyArray<keyof LightDarkColorParams> = THEME_VARIANTS.flatMap(
  (variant) => BASE_COLOR_KEYS.map((key) => `${key}_${variant}` as const),
);

/** @returns The theme a name stands for in one mode: a family's variant, any other name itself. */
const variantOf = (name: string, variant: ThemeVariant): string => {
  if (isThemeFamily(name)) {
    return `${name}_${variant}`;
  }
  return name;
};

/**
 * Returns resolved colors for both light and dark mode given all input params.
 *
 * Each mode resolves independently, then runs the normal `getCardColors` precedence
 * (explicit color -> theme color -> default theme):
 *   light: `theme_light ?? theme ?? ember`, with `*_light` params overriding general ones
 *   dark:  `theme_dark  ?? theme ?? ember`, with `*_dark`  params overriding general ones
 *
 * A family name stands for its variant of each mode, so `theme=cobalt` draws `cobalt_light`
 * and `cobalt_dark`. Anything a mode does not override falls back to the general params,
 * so a partial override such as `bg_color_dark` alone keeps every other color from the base theme.
 *
 * A family beside an opaque `bg_color` and nothing per-mode wears the variant made for that
 * background alone, rather than one variant's text on a background meant for the other.
 *
 * When both modes resolve to one variant and no other `_light` / `_dark` param is given,
 * `darkColors` is `null` and the caller emits no dark-mode block.
 *
 * @returns `{ lightColors, darkColors }`, resolved colors for both light and dark mode
 */
const getLightDarkColors = (
  params: ColorInput & LightDarkColorParams,
): { lightColors: CardColors; darkColors: CardColors | null } => {
  const theme = params.theme ?? DEFAULT_THEME_FAMILY;
  const perMode = MODE_OVERRIDE_KEYS.some((key) => params[key] !== undefined);

  if (!perMode && isThemeFamily(theme) && params.bg_color !== undefined) {
    const tone = backgroundTone(backgroundColor(params.bg_color, ''));
    if (tone !== 'translucent') {
      return {
        lightColors: getCardColors({ ...params, theme: `${theme}_${tone}` }),
        darkColors: null,
      };
    }
  }

  const light = variantOf(params.theme_light ?? theme, 'light');
  const dark = variantOf(params.theme_dark ?? theme, 'dark');
  const perModeColors = MODE_OVERRIDE_KEYS.some(
    (key) => key !== 'theme_light' && key !== 'theme_dark' && params[key] !== undefined,
  );
  if (light === dark && !perModeColors) {
    return { lightColors: getCardColors({ ...params, theme: light }), darkColors: null };
  }

  return {
    lightColors: getCardColors({
      ...params,
      ...extractLightDarkColors(params, '_light'),
      theme: light,
    }),
    darkColors: getCardColors({
      ...params,
      ...extractLightDarkColors(params, '_dark'),
      theme: dark,
    }),
  };
};

type ColorParams = ColorInput & LightDarkColorParams;

const COLOR_PARAM_KEYS: ReadonlyArray<keyof ColorParams> = [
  ...BASE_COLOR_KEYS,
  ...THEME_VARIANTS.flatMap((variant) =>
    BASE_COLOR_KEYS.map((key) => `${key}_${variant}` as const),
  ),
];

/** Params naming a theme rather than holding a color value. */
const THEME_PARAM_KEYS: ReadonlyArray<keyof ColorParams> = [
  'theme',
  ...THEME_VARIANTS.map((variant) => `theme_${variant}` as const),
];

export type { CardColors, ColorParams };

export {
  HEAT_ID,
  HEAT_PAINT,
  isValidBackground,
  THEME_PARAM_KEYS,
  getCardColors,
  getLightDarkColors,
  isValidGradient,
  isBareHexColor,
  isPrefixedHexColor,

  // Not re-exported from the package index: internal,
  // exposed so tests can pin the accepted param list.
  BASE_COLOR_KEYS,
  THEME_VARIANTS,
  COLOR_PARAM_KEYS,
};
