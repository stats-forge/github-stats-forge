import { themes } from '@stats-forge/github-stats-forge-core/api';

/**
 * @file What a theme looks like, at the size of a dropdown row.
 *
 * A miniature of the card rather than a strip of squares: the ground is the theme's background and
 * the dots are its title, icon and text colors, so a pale title on a pale ground reads as one.
 */

/** The three colors drawn on the swatch, in the order a card uses them. */
const DOTS = ['title_color', 'icon_color', 'text_color'] as const;

/** A theme's own name for a color, as the table holds it: hex, no `#`. */
type Channel = (typeof DOTS)[number];

/**
 * The table stores hex without a `#`, and `bg_color` may carry alpha or a gradient spec.
 *
 * @returns A value CSS can use, or `transparent` for anything that is not plain hex.
 */
const toCss = (value: string | undefined): string => {
  if (value === undefined) {
    return 'transparent';
  }
  return /^[\dA-Fa-f]{3,8}$/.test(value) ? `#${value}` : 'transparent';
};

/** The theme table, read by name rather than by key: the caller has a string. */
const BY_NAME: Readonly<
  Record<string, Partial<Record<Channel | 'bg_color' | 'border_color', string>> | undefined>
> = themes;

/**
 * The swatch for one theme.
 *
 * @returns The element, or `undefined` when no theme goes by that name.
 */
const themeSwatch = (name: string): HTMLElement | undefined => {
  const theme = BY_NAME[name];
  if (theme === undefined) {
    return undefined;
  }

  const swatch = document.createElement('span');
  swatch.className = 'anvil-swatch';
  swatch.ariaHidden = 'true';
  swatch.style.setProperty('--swatch-bg', toCss(theme.bg_color));
  swatch.style.setProperty(
    '--swatch-border',
    theme.border_color === undefined ? 'currentColor' : toCss(theme.border_color),
  );

  for (const channel of DOTS) {
    const dot = document.createElement('i');
    dot.style.background = toCss(theme[channel]);
    swatch.append(dot);
  }

  return swatch;
};

export { themeSwatch };
