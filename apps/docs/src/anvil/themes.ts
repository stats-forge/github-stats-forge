import { themes } from '@stats-forge/github-stats-forge-core/api';

/**
 * @file Which themes a card may wear, and how they are ordered.
 *
 * Ported from `ghse`'s wizard (`themeBackdrop.ts`, `Theme.tsx`) so both projects offer the same
 * themes for the same card. Neither rule below is derivable from core's theme table alone.
 */

/**
 * What a card is about. It groups the card picker, and it decides which half of every theme pair
 * the card wears: one describing a repository or gist takes the `_repocard` variants, and
 * anything else — a user's card, an organization's — takes the plain half.
 */
type CardCategory = 'org' | 'repo' | 'user';

/** Where a theme sits in the list, and under which heading. */
type ThemeMode = 'light' | 'mixed' | 'dark';

/** Only genuinely mode-agnostic ones: `shadow_*` is transparent but dark-texted, so it is light. */
const ADAPTIVE_THEMES = new Set(['transparent', 'ambient_gradient']);

const THEME_NAMES = Object.keys(themes);

/** @returns The hex expanded to six digits, or as given when it is not a shorthand. */
const expandHex = (hex: string): string =>
  hex.length === 3 ? [...hex].map((char) => char + char).join('') : hex;

/** @returns Whether a 3-, 6- or 8-digit hex reads as dark, by perceived luminance. */
const isDarkHex = (hex: string): boolean => {
  const normalized = expandHex(hex);
  if (normalized.length < 6) {
    return false;
  }
  const channel = (at: number): number => Number.parseInt(normalized.slice(at, at + 2), 16);
  const luminance = (0.299 * channel(0) + 0.587 * channel(2) + 0.114 * channel(4)) / 255;
  return luminance < 0.5;
};

/**
 * A `bg_color` is a hex or an `angle,color,color…` gradient, judged by its first stop.
 *
 * @returns Whether the background reads as dark.
 */
const isDarkBackground = (bgColor: string): boolean => {
  const parts = bgColor.split(',');
  return isDarkHex((parts.length > 1 ? parts[1] : parts[0]) ?? '');
};

/** @returns Which group a theme is listed under. */
const themeMode = (name: string): ThemeMode => {
  if (ADAPTIVE_THEMES.has(name)) {
    return 'mixed';
  }
  const theme = themes[name as keyof typeof themes] as { bg_color: string } | undefined;
  return theme !== undefined && isDarkBackground(theme.bg_color) ? 'dark' : 'light';
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

export { themeGroups };
export type { CardCategory };
