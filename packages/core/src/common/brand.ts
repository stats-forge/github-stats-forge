/**
 * The visual vocabulary every card draws with: one font stack, one type scale,
 * one set of widths and the accent rule that marks a card as this tool's.
 * A card composes from here; it never writes a `font` shorthand or a size of its own.
 */
import type { Child, CssChild } from '../markup/index.ts';
import { atRule, cssComment, rule } from '../markup/index.ts';

import { icons } from './icons.ts';

const FONT_STACK = `'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif`;

/**
 * Every measure a card draws to, under one name so a card imports the vocabulary
 * rather than a line of it per figure.
 */
const CARD_STYLE = {
  /**
   * The widths a card may default to. A card picks the step nearest what its layout
   * needs, so cards stacked in a README share an edge instead of forming a ragged one.
   */
  width: {
    compact: 300,
    standard: 400,
    wide: 500,
  },

  /** The type scale, in px. */
  fontSize: {
    display: 22,
    title: 18,
    lead: 16,
    body: 14,
    meta: 13,
    small: 12,
    micro: 11,
  },

  /** `regular` labels, `semibold` the values they label, `bold` the rank glyph alone. */
  fontWeight: {
    regular: 400,
    semibold: 600,
    bold: 700,
  },

  /**
   * The one size off the scale. Firefox is given 15.5px rather than the scale's next step down,
   * because that half pixel is inherited tuning for long titles and nothing here can test the
   * wrapping it protects; it lives with the scale so `brand.ts` still owns every size a card draws.
   */
  titleFirefoxSize: 15.5,

  /**
   * The air a card keeps at its edges.
   *
   * `bottom` is what the last row is measured against, so it holds whatever `line_height`
   * a card is given; deriving it from the line height instead put 33px under a top-languages
   * card against the 17px above its title.
   */
  padding: {
    /** Matches `Card`'s own `paddingX`. */
    x: 25,
    bottom: 18,
    /** Where `Card` puts the body while the title is shown; `setHideTitle` adjusts by the same 30. */
    bodyOffsetY: 55,
  },

  /** How far a stat row's ink reaches below its own top: the icon box, which outruns the text. */
  statRowInk: 16,

  /** The tinted band behind every card title: the mark a card is recognized by. */
  band: {
    /** Enough to read as a band on every theme, little enough to leave the title legible. */
    opacity: 0.08,
    /** Clear air the band leaves between its foot and the first row of the body. */
    gap: 9,
  },

  /** The rule under the title icon, sitting inside the band. */
  accent: {
    width: 32,
    height: 2,
    /** Below the title's descenders, clear of the band's foot. */
    y: 8,
  },
} as const;

type FontSize = keyof typeof CARD_STYLE.fontSize;
type FontWeight = keyof typeof CARD_STYLE.fontWeight;

/** @returns The `font` shorthand for one step of the scale. */
const font = (weight: FontWeight, size: FontSize): string =>
  `${String(CARD_STYLE.fontWeight[weight])} ${String(CARD_STYLE.fontSize[size])}px ${FONT_STACK}`;

/**
 * Firefox lays Segoe UI out wider than the other engines, so text that fits
 * elsewhere overflows there; each affected selector steps down a size.
 *
 * @returns The `@supports` block that detects Firefox and resizes those selectors.
 */
const firefoxFontSize = (selectors: Array<string>, size: FontSize | number): CssChild => {
  const px = typeof size === 'number' ? size : CARD_STYLE.fontSize[size];
  return atRule(
    '@supports(-moz-appearance: auto)',
    cssComment('Selector detects Firefox'),
    selectors.map((selector) => rule(selector, { 'font-size': `${String(px)}px` })),
  );
};

/**
 * The title icon each card wears. They are distinct on purpose: with the band
 * and the shared type, the icon is what tells one card from another at a glance.
 */
const CARD_ICON = {
  contributedTo: icons.prs_merged,
  gist: icons.gist,
  orgActivity: icons.calendar,
  organization: icons.organization,
  repo: icons.repo,
  stats: icons.pulse,
  topLanguages: icons.code,
  wakatime: icons.clock,
} satisfies Record<string, Child>;

export { CARD_STYLE, CARD_ICON, firefoxFontSize, font };
