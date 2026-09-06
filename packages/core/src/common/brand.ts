/**
 * The visual vocabulary every card draws with: one font stack, one type scale,
 * one set of widths and the accent rule that marks a card as this tool's.
 * A card composes from here; it never writes a `font` shorthand or a size of its own.
 */
import type { Child, CssChild } from '../markup/index.ts';
import { atRule, cssComment, rule } from '../markup/index.ts';

import { icons } from './icons.ts';

const FONT_STACK = `'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif`;

/** The type scale, in px. */
const FONT_SIZE = {
  display: 22,
  title: 18,
  lead: 16,
  body: 14,
  meta: 13,
  small: 12,
  micro: 11,
} as const;

/**
 * The one size off the scale. Firefox is given 15.5px rather than the scale's next step down,
 * because that half pixel is inherited tuning for long titles and nothing here can test the
 * wrapping it protects; it lives with the scale so `brand.ts` still owns every size a card draws.
 */
const TITLE_FIREFOX_SIZE = 15.5;

/** `regular` labels, `semibold` the values they label, `bold` the rank glyph alone. */
const FONT_WEIGHT = {
  regular: 400,
  semibold: 600,
  bold: 700,
} as const;

type FontSize = keyof typeof FONT_SIZE;
type FontWeight = keyof typeof FONT_WEIGHT;

/** @returns The `font` shorthand for one step of the scale. */
const font = (weight: FontWeight, size: FontSize): string =>
  `${String(FONT_WEIGHT[weight])} ${String(FONT_SIZE[size])}px ${FONT_STACK}`;

/**
 * Firefox lays Segoe UI out wider than the other engines, so text that fits
 * elsewhere overflows there; each affected selector steps down a size.
 *
 * @returns The `@supports` block that detects Firefox and resizes those selectors.
 */
const firefoxFontSize = (selectors: Array<string>, size: FontSize | number): CssChild => {
  const px = typeof size === 'number' ? size : FONT_SIZE[size];
  return atRule(
    '@supports(-moz-appearance: auto)',
    cssComment('Selector detects Firefox'),
    selectors.map((selector) => rule(selector, { 'font-size': `${String(px)}px` })),
  );
};

/**
 * The widths a card may default to. A card picks the step nearest what its layout
 * needs, so cards stacked in a README share an edge instead of forming a ragged one.
 */
const CARD_WIDTH = {
  compact: 300,
  standard: 400,
  wide: 500,
} as const;

/** The tinted band behind every card title: the mark a card is recognized by. */
const TITLE_BAND = {
  /** Enough to read as a band on every theme, little enough to leave the title legible. */
  opacity: 0.08,
  /** Clear air the band leaves between its foot and the first row of the body. */
  gap: 9,
} as const;

/** The rule under the title icon, sitting inside the band. */
const ACCENT = {
  width: 32,
  height: 2,
  /** Below the title's descenders, clear of the band's foot. */
  y: 8,
} as const;

/**
 * The title icon each card wears. They are distinct on purpose: with the band
 * and the shared type, the icon is what tells one card from another at a glance.
 */
const CARD_ICON = {
  contributedTo: icons.prs_merged,
  gist: icons.gist,
  repo: icons.repo,
  stats: icons.pulse,
  topLanguages: icons.code,
  wakatime: icons.clock,
} satisfies Record<string, Child>;

export {
  ACCENT,
  CARD_ICON,
  CARD_WIDTH,
  FONT_SIZE,
  FONT_WEIGHT,
  firefoxFontSize,
  font,
  TITLE_BAND,
  TITLE_FIREFOX_SIZE,
};
