/**
 * @file Which themes a card may wear, how they are grouped, and which ground each implies.
 *
 * The ground is core's own verdict, through `cardGround`, so the preview and the card cannot judge
 * a background differently.
 */

import { cardGround, themes } from '@stats-forge/github-stats-forge-core/api';
import type { CardGround } from '@stats-forge/github-stats-forge-core/api';

/** Where a theme sits in the list, and under which heading. */
type ThemeMode = 'light' | 'mixed' | 'dark';

/** The ground a card is previewed on, where its own background says which one is right. */
type Backdrop = 'light' | 'dark';

/** What a card asks of its ground: one, or whichever the browser's color scheme picks. */
type ImpliedBackdrop = Backdrop | 'browser';

const THEME_NAMES = Object.keys(themes);

/** Each theme by its name in lower case, since core matches a theme param in any case. */
const THEME_BY_LOWER_NAME = new Map(THEME_NAMES.map((name) => [name.toLowerCase(), name]));

/**
 * Reads a `theme` param as core's `parseArray` does, dropping empty entries.
 *
 * @returns Each name as core spells it, or `undefined` where core would refuse the param.
 */
const canonicalThemes = (theme: string): Array<string> | undefined => {
  const names = theme
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '')
    .map((name) => THEME_BY_LOWER_NAME.get(name.toLowerCase()));
  if (names.length === 0 || names.length > 2 || !names.every((name) => name !== undefined)) {
    return undefined;
  }
  return names;
};

/** @returns Which group a theme is listed under. */
const themeMode = (name: string): ThemeMode => {
  const ground: CardGround = cardGround({ theme: name });
  if (ground === 'viewer' || ground === 'translucent') {
    return 'mixed';
  }
  return ground;
};

/**
 * Which ground the card should be previewed on.
 *
 * @returns The ground; `browser` where the card follows the browser's color scheme, as a pair of
 * two themes does; or `undefined` where it names none — a translucent background or a
 * theme nobody has heard of. There whichever ground is showing is left showing.
 */
const backdropFor = (query: Readonly<Record<string, string>>): ImpliedBackdrop | undefined => {
  const theme = query['theme'] ?? '';
  const names = theme === '' ? [] : canonicalThemes(theme);
  if (names === undefined) {
    return undefined;
  }

  const ground = cardGround({ theme: names.length === 0 ? undefined : names.join(',') });
  if (ground === 'viewer') {
    return 'browser';
  }
  if (ground === 'translucent') {
    return undefined;
  }
  return ground;
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

/** @returns The themes, grouped by the background each implies. */
const themeGroups = (): Array<ThemeGroup> =>
  GROUP_LABELS.map(([mode, label]) => ({
    label,
    values: THEME_NAMES.filter((name) => themeMode(name) === mode),
  })).filter((group) => group.values.length > 0);

export { backdropFor, themeGroups };
export type { Backdrop };
