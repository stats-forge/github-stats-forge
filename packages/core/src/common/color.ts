import { DEFAULT_THEME, isThemeName, themes } from '../themes/index.ts';

/** Matches a 3-, 4-, 6-, or 8-digit hex color with no leading `#`. */
const HEX_COLOR = /^(?<digits>[A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{3})$/;

/**
 * Checks if a value is a `#`-prefixed hex color (`"#f00"`, `"#ffffff"`), the form colors take
 * right before they are written into the SVG.
 *
 * @returns True if the value is a `#`-prefixed hex color.
 */
const isPrefixedHexColor = (value: unknown): boolean =>
  typeof value === 'string' && value.startsWith('#') && HEX_COLOR.test(value.slice(1));

/** @returns A `#`-prefixed hex color's digits, a shorthand expanded to six or eight. */
const expandHex = (hex: string): string => {
  const digits = hex.slice(1);
  if (digits.length <= 4) {
    return [...digits].map((digit) => digit + digit).join('');
  }
  return digits;
};

/**
 * @returns Its `[r, g, b, a]` channels, each on 0–1.
 */
const hexChannels = (hex: string): [number, number, number, number] => {
  const expanded = expandHex(hex);
  const channel = (index: number): number =>
    Number.parseInt(expanded.slice(index * 2, index * 2 + 2), 16) / 255;

  return [channel(0), channel(1), channel(2), expanded.length === 8 ? channel(3) : 1];
};

type BackgroundTone = 'light' | 'dark' | 'translucent';

/**
 * @returns Whether the background reads light, dark, or lets the page behind it show through.
 */
const backgroundTone = (bgColor: string): BackgroundTone => {
  if (!isPrefixedHexColor(bgColor)) {
    return 'light';
  }

  const [r, g, b, a] = hexChannels(bgColor);
  if (a < 0.5) {
    return 'translucent';
  }

  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5 ? 'dark' : 'light';
};

/** A progress bar's empty track, as bright as `#ddd` is dark on a light card. */
const PROG_BAR_BG_BY_TONE: Readonly<Record<BackgroundTone, string>> = {
  light: '#ddd',
  dark: '#ffffff33',
  translucent: '#8b949e59',
};

/**
 * Resolved card colors for a single color scheme, as written into the SVG.
 */
interface CardColors {
  /** The heat gradient's stops, brightest first. */
  heat: [string, string, string];
  /** The heat's middle stop, where a card wants its accent as one color. */
  titleColor: string;
  /** Card icon color. */
  iconColor: string;
  /** Card text color. */
  textColor: string;
  /** Card background color. */
  bgColor: string;
  /** Card border color. */
  borderColor: string;
  /** Stats card rank ring paint: {@link HEAT_PAINT}'s ring gradient. */
  ringColor: string;
  /** Progress bar background color. */
  progBarBgColor: string;
  /** How strongly the corner glow shows, on 0–1. */
  glowOpacity: number;
  /** How strongly the title band shows, on 0–1. */
  bandOpacity: number;
}

/** The ids `Card` defines its heat gradients under, so a card can paint with one. */
const HEAT_ID = {
  line: 'heat',
  ring: 'heat-ring',
  trail: 'heat-trail',
  glow: 'heat-glow',
  band: 'heat-band',
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
  light: 0.05,
  dark: 0.13,
  translucent: 0.08,
};

/** The band, like the glow, needs more on a dark card to show at all. */
const BAND_OPACITY_BY_TONE: Readonly<Record<BackgroundTone, number>> = {
  light: 0.05,
  dark: 0.08,
  translucent: 0.06,
};

/** How much of its band a quiet theme keeps: enough to frame the title, too little to glow. */
const QUIET_BAND_SHARE = 0.5;

/** `4d` of `ff`: the border is the heat's middle stop at this alpha. */
const HEAT_BORDER_ALPHA = '4d';

/** The one color param a card takes: a theme name, or a `light,dark` pair of them. */
interface ThemeParams {
  theme?: string | undefined;
}

/** @returns The colors one theme draws with; an unknown name draws `ember_light`. */
const getCardColors = (name?: string): CardColors => {
  const theme = isThemeName(name) ? themes[name] : themes.ember_light;

  const heat: CardColors['heat'] = [`#${theme.heat[0]}`, `#${theme.heat[1]}`, `#${theme.heat[2]}`];
  const [, titleColor] = heat;
  const bgColor = `#${theme.bg_color}`;
  const tone = backgroundTone(bgColor);
  const borderColor =
    'border_color' in theme ? `#${theme.border_color}` : `${titleColor}${HEAT_BORDER_ALPHA}`;

  return {
    heat,
    titleColor,
    iconColor: titleColor,
    textColor: `#${theme.text_color}`,
    bgColor,
    borderColor,
    ringColor: HEAT_PAINT.ring,
    progBarBgColor: PROG_BAR_BG_BY_TONE[tone],
    glowOpacity: 'quiet' in theme ? 0 : GLOW_OPACITY_BY_TONE[tone],
    bandOpacity: BAND_OPACITY_BY_TONE[tone] * ('quiet' in theme ? QUIET_BAND_SHARE : 1),
  };
};

/**
 * Resolves `theme` for both color schemes: one name serves both modes, a `light,dark` pair names
 * each mode's own.
 *
 * @returns Both palettes; `darkColors` is `null` when both modes draw one theme, so the caller
 * emits no dark-mode block.
 */
const getLightDarkColors = ({
  theme = DEFAULT_THEME,
}: ThemeParams): { lightColors: CardColors; darkColors: CardColors | null } => {
  const [light = '', dark = light] = theme.split(',');
  if (light === dark) {
    return { lightColors: getCardColors(light), darkColors: null };
  }
  return { lightColors: getCardColors(light), darkColors: getCardColors(dark) };
};

/** @returns WCAG's relative luminance of a color's red, green and blue, each on 0–1. */
const relativeLuminance = (channels: ReadonlyArray<number>): number => {
  const [r = 0, g = 0, b = 0] = channels.map((channel) => {
    if (channel <= 0.04045) {
      return channel / 12.92;
    }
    return ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** @returns WCAG's contrast ratio between two luminances, from 1 to 21. */
const contrastRatio = (a: number, b: number): number =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** The pages a translucent card may stand on: GitHub's light and dark grounds. */
const PAGE_GROUNDS = ['#ffffff', '#0d1117'] as const;

/** WCAG AA's contrast for text, which the theme's own ink is kept while it clears. */
const TEXT_CONTRAST = 4.5;

/**
 * The ink that reads best on a fill laid at `opacity` over the card's background: the theme's text
 * color or its background while one clears {@link TEXT_CONTRAST}, else black or white. A
 * translucent card's ink must read on either page it may stand on.
 *
 * @returns The ink.
 */
const inkOn = (colors: CardColors, fill: string, opacity: number): string => {
  const { textColor, bgColor } = colors;
  const translucent = backgroundTone(bgColor) === 'translucent';
  const grounds = translucent ? PAGE_GROUNDS : [bgColor];
  const [r, g, b, a] = hexChannels(fill);
  const alpha = a * opacity;
  const laid = grounds.map((ground) => {
    const below = hexChannels(ground);
    return relativeLuminance(
      [r, g, b].map((channel, index) => channel * alpha + (below[index] ?? 0) * (1 - alpha)),
    );
  });
  /** @returns The ink's contrast on the fill over whichever ground it reads worst on. */
  const worst = (ink: string): number =>
    Math.min(...laid.map((cell) => contrastRatio(cell, relativeLuminance(hexChannels(ink)))));
  /** @returns The first of `inks` that reads best, so a tie keeps the theme's own. */
  const best = ([first, ...rest]: readonly [string, ...Array<string>]): string => {
    let kept = first;
    for (const ink of rest) {
      if (worst(ink) > worst(kept)) {
        kept = ink;
      }
    }
    return kept;
  };

  // a translucent background is no ink at all
  const own = best(translucent ? [textColor] : [textColor, bgColor]);
  if (worst(own) >= TEXT_CONTRAST) {
    return own;
  }
  return best([own, '#ffffff', '#000000']);
};

/** What a card stands on: its one background's tone, or `viewer` when it carries both schemes. */
type CardGround = BackgroundTone | 'viewer';

/** @returns The ground a card drawn in this theme stands on. */
const cardGround = (params: ThemeParams): CardGround => {
  const { lightColors, darkColors } = getLightDarkColors(params);
  if (darkColors) {
    return 'viewer';
  }
  return backgroundTone(lightColors.bgColor);
};

export type { CardColors, CardGround, ThemeParams };

export {
  cardGround,
  getCardColors,
  getLightDarkColors,
  HEAT_ID,
  HEAT_PAINT,
  inkOn,
  isPrefixedHexColor,
};
