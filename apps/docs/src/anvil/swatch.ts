/**
 * @file What a theme looks like, at the size of a dropdown row.
 *
 * A miniature of the card rather than a strip of squares: the ground is the theme's background and
 * the dots are its heat's two ends and its text, so a pale heat on a pale ground reads as one.
 */

import { themes } from '@stats-forge/github-stats-forge-core/api';
import type { ThemeName } from '@stats-forge/github-stats-forge-core/api';

/**
 * The table stores hex without a `#`, and `bg_color` may carry alpha.
 *
 * @returns A value CSS can use, or `transparent` for anything that is not plain hex.
 */
const toCss = (value: string | undefined): string => {
  if (value === undefined) {
    return 'transparent';
  }
  return /^[\dA-Fa-f]{3,8}$/.test(value) ? `#${value}` : 'transparent';
};

/** @returns The theme a name draws its dots from, and the ground it stands on. */
const variantsOf = (
  name: string,
): { dots: (typeof themes)[ThemeName]; grounds: Array<string> } | undefined => {
  if (!Object.hasOwn(themes, name)) {
    return undefined;
  }
  const theme = themes[name as ThemeName];
  return { dots: theme, grounds: [theme.bg_color] };
};

/**
 * The swatch for one theme.
 *
 * @returns The element, or `undefined` when no theme goes by that name.
 */
const themeSwatch = (name: string): HTMLElement | undefined => {
  const variants = variantsOf(name);
  if (variants === undefined) {
    return undefined;
  }
  const { dots, grounds } = variants;

  const swatch = document.createElement('span');
  swatch.className = 'anvil-swatch';
  swatch.ariaHidden = 'true';
  const [first, second] = grounds.map((ground) => toCss(ground));
  swatch.style.setProperty(
    '--swatch-bg',
    second === undefined
      ? (first ?? 'transparent')
      : `linear-gradient(90deg, ${first ?? ''} 50%, ${second} 50%)`,
  );
  swatch.style.setProperty(
    '--swatch-border',
    'border_color' in dots ? toCss(dots.border_color) : 'currentColor',
  );

  for (const color of [dots.heat[0], dots.heat[2], dots.text_color]) {
    const dot = document.createElement('i');
    dot.style.background = toCss(color);
    swatch.append(dot);
  }

  return swatch;
};

export { themeSwatch };
