/**
 * @file Which themes a card may wear, how they are grouped, and which ground each implies.
 *
 * A family name (`ember`) follows the viewer, so it implies no ground; a variant (`ember_dark`)
 * implies its own background's.
 */

import { THEME_FAMILIES, themes } from '@stats-forge/github-stats-forge-core/api';

/** Where a theme sits in the list, and under which heading. */
type ThemeMode = 'light' | 'mixed' | 'dark';

/** The ground a card is previewed on, where its own background says which one is right. */
type Backdrop = 'light' | 'dark';

/** Below this a background shows the page through it, so it implies no ground of its own. */
const OPAQUE_ALPHA = 0x80;

const VARIANT_NAMES = Object.keys(themes);
const FAMILY_NAMES: ReadonlyArray<string> = THEME_FAMILIES;

/** The family a card wears when no theme is named, which follows the viewer. */
const DEFAULT_THEME = 'ember';

/** @returns The hex expanded from three or four digits, or as given when it is not a shorthand. */
const expandHex = (hex: string): string => {
  if (hex.length !== 3 && hex.length !== 4) {
    return hex;
  }

  return [...hex].map((char) => char + char).join('');
};

/** @returns Whether a 6- or 8-digit hex reads as dark, by perceived luminance. */
const isDarkHex = (hex: string): boolean => {
  const channel = (at: number): number => Number.parseInt(hex.slice(at, at + 2), 16);
  const luminance = (0.299 * channel(0) + 0.587 * channel(2) + 0.114 * channel(4)) / 255;
  return luminance < 0.5;
};

/**
 * A `bg_color` is a hex or an `angle,color,color…` gradient, judged by its first stop.
 *
 * @returns The ground it implies, or `undefined` when it is not hex, or translucent enough that
 * whatever is behind it is what shows.
 */
const groundOf = (bgColor: string): Backdrop | undefined => {
  const stops = bgColor.split(',');
  const hex = expandHex((stops.length > 1 ? stops[1] : stops[0]) ?? '');
  if (!/^[\dA-Fa-f]{6}(?:[\dA-Fa-f]{2})?$/.test(hex)) {
    return undefined;
  }
  if (hex.length === 8 && Number.parseInt(hex.slice(6, 8), 16) < OPAQUE_ALPHA) {
    return undefined;
  }
  return isDarkHex(hex) ? 'dark' : 'light';
};

/** @returns The variant's `bg_color` as the table holds it — hex, no `#` — or `undefined`. */
const bgColorOf = (name: string): string | undefined =>
  (themes[name as keyof typeof themes] as { bg_color: string } | undefined)?.bg_color;

/** @returns Which group a theme is listed under. */
const themeMode = (name: string): ThemeMode => {
  const bgColor = bgColorOf(name);
  const ground = bgColor === undefined ? undefined : groundOf(bgColor);
  return ground ?? 'mixed';
};

/**
 * Any per-scheme background: with one of these the card carries a `prefers-color-scheme` block and
 * follows the browser, so neither ground is the one it will be seen on.
 */
const PER_SCHEME_BACKGROUNDS = ['theme_light', 'theme_dark', 'bg_color_light', 'bg_color_dark'];

/**
 * Which ground the card should be previewed on: its own `bg_color` if it names one, else its
 * theme's.
 *
 * @returns The ground, or `undefined` where the card names none — a family, which follows the
 * viewer, a translucent background, a per-scheme override, or a theme nobody has heard of. There
 * whichever ground is showing is left showing, rather than the page guessing on the reader's behalf.
 */
const backdropFor = (query: Readonly<Record<string, string>>): Backdrop | undefined => {
  if (PER_SCHEME_BACKGROUNDS.some((name) => (query[name] ?? '') !== '')) {
    return undefined;
  }

  // A family beside an opaque background wears the variant made for it, so the background decides.
  const custom = query['bg_color'] ?? '';
  if (custom !== '') {
    return groundOf(custom);
  }

  const named = query['theme'] ?? '';
  const name = named === '' ? DEFAULT_THEME : named;
  const bgColor = bgColorOf(name);
  return bgColor === undefined ? undefined : groundOf(bgColor);
};

/** One heading in the theme list, and the themes under it. */
interface ThemeGroup {
  label: string;
  values: Array<string>;
}

/** The headings, in the order they are shown. */
const GROUP_LABELS: ReadonlyArray<[ThemeMode, string]> = [
  ['light', 'Light'],
  ['mixed', 'Either'],
  ['dark', 'Dark'],
];

/** @returns The themes, grouped by the background each implies, families under "Either". */
const themeGroups = (): Array<ThemeGroup> =>
  GROUP_LABELS.map(([mode, label]) => ({
    label,
    values: [
      ...(mode === 'mixed' ? FAMILY_NAMES : []),
      ...VARIANT_NAMES.filter((name) => themeMode(name) === mode),
    ],
  })).filter((group) => group.values.length > 0);

export { backdropFor, themeGroups };
export type { Backdrop };
