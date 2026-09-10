/**
 * @file Which themes a card may wear, how they are ordered, and which ground each implies.
 *
 * Ported from `ghse`'s wizard (`themeBackdrop.ts`, `Theme.tsx`) so both projects offer the same
 * themes for the same card. Neither ordering rule below is derivable from core's theme table alone.
 */

import { themes } from '@stats-forge/github-stats-forge-core/api';

/**
 * What a card is about. It groups the card picker, and it decides which half of every theme pair
 * the card wears: one describing a repository or gist takes the `_repocard` variants, and
 * anything else — a user's card, an organization's — takes the plain half.
 */
type CardCategory = 'org' | 'repo' | 'user';

/** Where a theme sits in the list, and under which heading. */
type ThemeMode = 'light' | 'mixed' | 'dark';

/** The ground a card is previewed on, where its own background says which one is right. */
type Backdrop = 'light' | 'dark';

/** Only genuinely mode-agnostic ones: `shadow_*` is transparent but dark-texted, so it is light. */
const ADAPTIVE_THEMES = new Set(['transparent', 'ambient_gradient']);

/** Below this a background shows the page through it, so it implies no ground of its own. */
const OPAQUE_ALPHA = 0x80;

const THEME_NAMES = Object.keys(themes);

/** @returns The hex expanded from three or four digits, or as given when it is not a shorthand. */
const expandHex = (hex: string): string =>
  hex.length === 3 || hex.length === 4 ? [...hex].map((char) => char + char).join('') : hex;

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

/** @returns The theme's `bg_color` as the table holds it — hex, no `#` — or `undefined`. */
const bgColorOf = (name: string): string | undefined =>
  (themes[name as keyof typeof themes] as { bg_color: string } | undefined)?.bg_color;

/** @returns Which group a theme is listed under. */
const themeMode = (name: string): ThemeMode => {
  if (ADAPTIVE_THEMES.has(name)) {
    return 'mixed';
  }
  const bgColor = bgColorOf(name);
  return bgColor !== undefined && groundOf(bgColor) === 'dark' ? 'dark' : 'light';
};

/**
 * Themes come in pairs, and each card takes one side: a repo card keeps a name only when no
 * `${name}_repocard` exists, so it gets that half plus the unpaired themes.
 *
 * @returns The names, in no particular order.
 */
const themesForCategory = (category: CardCategory): Array<string> =>
  category === 'repo'
    ? THEME_NAMES.filter((name) => !THEME_NAMES.includes(`${name}_repocard`))
    : THEME_NAMES.filter((name) => !name.endsWith('_repocard'));

/** The half of the `default` pair this card wears, which is the theme it draws with when none is named. */
const defaultThemeFor = (category: CardCategory): string =>
  category === 'repo' ? 'default_repocard' : 'default';

/**
 * Any per-scheme background: with one of these the card carries a `prefers-color-scheme` block and
 * follows the browser, so neither ground is the one it will be seen on.
 */
const PER_SCHEME_BACKGROUNDS = ['theme_light', 'theme_dark', 'bg_color_light', 'bg_color_dark'];

/**
 * Which ground the card should be previewed on: its own `bg_color` if it names one, else its
 * theme's, else the theme it wears by default.
 *
 * @returns The ground, or `undefined` where the background names none — translucent, a per-scheme
 * override, or a theme nobody has heard of. There whichever ground is showing is left showing,
 * rather than the page guessing on the reader's behalf.
 */
const backdropFor = (
  query: Readonly<Record<string, string>>,
  category: CardCategory,
): Backdrop | undefined => {
  if (PER_SCHEME_BACKGROUNDS.some((name) => (query[name] ?? '') !== '')) {
    return undefined;
  }

  const custom = query['bg_color'] ?? '';
  if (custom !== '') {
    return groundOf(custom);
  }

  const named = query['theme'] ?? '';
  const name = named === '' ? defaultThemeFor(category) : named;
  if (ADAPTIVE_THEMES.has(name)) {
    return undefined;
  }

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

/** @returns The card's themes, grouped by the background each implies, empty groups dropped. */
const themeGroups = (category: CardCategory): Array<ThemeGroup> => {
  const available = themesForCategory(category);

  return GROUP_LABELS.map(([mode, label]) => ({
    label,
    values: available.filter((name) => themeMode(name) === mode),
  })).filter((group) => group.values.length > 0);
};

export { backdropFor, themeGroups };
export type { Backdrop, CardCategory };
