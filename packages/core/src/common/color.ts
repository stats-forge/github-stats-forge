import { isThemeName, themes } from '../themes/index.js';

/** Matches a 3-, 4-, 6-, or 8-digit hex color with no leading `#`. */
const HEX_COLOR = /^(?<digits>[A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{3})$/;

/**
 * Checks if a value is a bare hex color, i.e. hex digits with no `#` prefix
 * (`"f00"`, `"ffffff"`). This is the form user-supplied color params and
 * gradient stops arrive in.
 *
 * @returns True if the value is a bare hex color.
 */
const isBareHexColor = (value: unknown): boolean =>
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
 * Checks if a string is a valid input for a color or gradient.
 *
 * @returns True if the given string is a valid input.
 */
const isValidColorInput = (color: string | null | undefined): boolean => {
  if (color === null || color === undefined) {
    return true;
  }
  return isValidGradient(color.split(',')) || isBareHexColor(color);
};

/**
 * Retrieves a gradient if color has more than one valid hex codes else a single color.
 *
 * @returns The gradient or color.
 */
const fallbackColor = (
  color: string | undefined,
  fallback: string | Array<string>,
): string | Array<string> => {
  const colors = color ? color.split(',') : [];
  if (colors.length > 1 && isValidGradient(colors)) {
    return colors;
  }

  if (color !== undefined && isBareHexColor(color)) {
    return `#${color}`;
  }

  return fallback;
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

/**
 * Derives a border from the background, so a dark card never gets a light hairline.
 *
 * @returns A translucent `#`-prefixed hex border color.
 */
const borderColorFor = (bgColor: string | Array<string>): string => {
  // A gradient is judged by its first stop.
  const hex = typeof bgColor === 'string' ? bgColor : `#${bgColor[1] ?? ''}`;
  if (!isPrefixedHexColor(hex)) {
    return LIGHT_BG_BORDER;
  }

  const [r, g, b, a] = hexChannels(hex);
  if (a < 0.5) {
    return TRANSLUCENT_BG_BORDER;
  }

  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5 ? DARK_BG_BORDER : LIGHT_BG_BORDER;
};

/**
 * Resolved card colors for a single color scheme, as written into the SVG.
 */
interface CardColors {
  /** Card title color. */
  titleColor: string;
  /** Card icon color. */
  iconColor: string;
  /** Card text color. */
  textColor: string;
  /** Card background color, or a gradient as `[angle, ...stops]`. */
  bgColor: string | Array<string>;
  /** Card border color. */
  borderColor: string;
  /** Stats card rank ring color. */
  ringColor: string;
  /** Progress bar background color. */
  progBarBgColor: string;
}

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
  const defaultTheme = themes.default;
  const selectedTheme = isThemeName(theme) ? themes[theme] : defaultTheme;

  const themeBorderColor = 'border_color' in selectedTheme ? selectedTheme.border_color : undefined;

  // Each color is the user's, else the selected theme's, else the default theme's.
  const titleColor = fallbackColor(
    title_color || selectedTheme.title_color,
    `#${defaultTheme.title_color}`,
  );
  const iconColor = fallbackColor(
    icon_color || selectedTheme.icon_color,
    `#${defaultTheme.icon_color}`,
  );
  const textColor = fallbackColor(
    text_color || selectedTheme.text_color,
    `#${defaultTheme.text_color}`,
  );
  const bgColor = fallbackColor(bg_color || selectedTheme.bg_color, `#${defaultTheme.bg_color}`);

  const borderColor = fallbackColor(border_color || themeBorderColor, borderColorFor(bgColor));
  // No theme defines `ring_color`, so it falls back to the title color.
  const ringColor = fallbackColor(ring_color, titleColor);
  // No theme defines `prog_bar_bg_color`, so it falls back to "#ddd".
  const progBarBgColor = fallbackColor(prog_bar_bg_color, '#ddd');

  if (
    typeof titleColor !== 'string' ||
    typeof textColor !== 'string' ||
    typeof ringColor !== 'string' ||
    typeof progBarBgColor !== 'string' ||
    typeof iconColor !== 'string' ||
    typeof borderColor !== 'string'
  ) {
    throw new TypeError('Unexpected behavior, all colors except background should be string.');
  }

  return {
    titleColor,
    iconColor,
    textColor,
    bgColor,
    borderColor,
    ringColor,
    progBarBgColor,
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

/**
 * Returns resolved colors for both light and dark mode given all input params.
 *
 * Each mode resolves independently, then runs the normal `getCardColors` precedence
 * (explicit color -> theme color -> default theme):
 *   light: `theme_light ?? theme`, with `*_light` params overriding general ones
 *   dark:  `theme_dark  ?? theme`, with `*_dark`  params overriding general ones
 *
 * Anything a mode does not override falls back to the general params,
 * so a partial override such as `bg_color_dark` alone keeps every other color from the base theme.
 *
 * When no `_light` / `_dark` param is provided at all,
 * `darkColors` is `null` and the caller emits no dark-mode block.
 *
 * @returns `{ lightColors, darkColors }`, resolved colors for both light and dark mode
 */
const getLightDarkColors = (
  params: ColorInput & LightDarkColorParams,
): { lightColors: CardColors; darkColors: CardColors | null } => {
  // The common case is no per-scheme params at all, so it never builds the overrides.
  if (!MODE_OVERRIDE_KEYS.some((key) => params[key] !== undefined)) {
    return { lightColors: getCardColors(params), darkColors: null };
  }

  return {
    lightColors: getCardColors({ ...params, ...extractLightDarkColors(params, '_light') }),
    darkColors: getCardColors({ ...params, ...extractLightDarkColors(params, '_dark') }),
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
  isValidColorInput,
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
