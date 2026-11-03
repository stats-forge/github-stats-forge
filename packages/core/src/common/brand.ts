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
   * `bottom` is what the last row's ink is measured against, so it holds whatever a card's row
   * spacing is; deriving it from that spacing instead put 33px under a top-languages card
   * against the 17px above its title.
   */
  padding: {
    /** The side padding, `Card`'s `paddingX`: wider than `bottom`, as lines of text need. */
    x: 18,
    /** The same air as above the title's ink, so a card sits even between its edges. */
    bottom: 12,
    /** The title's baseline: its ink, 13px tall, starts `bottom` below the top edge. */
    titleY: 25,
    /** Where `Card` puts the body while the title is shown. */
    bodyOffsetY: 50,
    /** Where it puts the body when the title is hidden: the same air above as `bottom` below. */
    untitledBodyOffsetY: 12,
  },

  /** A two-column language list, each row a dot then its label. */
  compactList: {
    /** Where a row's label starts, clear of its dot. */
    labelX: 15,
    /** Air between the first column's widest label and the second column. */
    columnAir: 5,
  },

  /** How far a stat row's ink reaches below its own top: the icon box, which outruns the text. */
  statRowInk: 15,

  /** `measureText` reads regular widths; a semibold line draws about a tenth wider. */
  semiboldInk: 1.1,

  /** A big total leading a card's body, with a line of what it means beside it. */
  headline: {
    /** Its room: the total's line, then the air before what follows. */
    height: 36,
    /** The total's baseline, so its ink starts at the body's top. */
    baseline: 17,
    /** Air between the total and the line beside it. */
    gap: 10,
  },

  /** The band behind the title, filled with the heat: with the trail, what a card is known by. */
  band: {
    /** Clear air the band leaves between its foot and the first row of the body. */
    gap: 9,
    /** The last stop's share of the band's opacity, so it cools toward the right. */
    edgeShare: 0.7,
  },

  /** The glow in the card's bottom-right corner, drawn in the heat's middle and last stops. */
  glow: {
    /** The last stop's share of the glow's opacity, where the middle one fades into it. */
    edgeShare: 0.35,
  },

  /** The blur behind what burns: the rank ring, a bar's tip. */
  bloom: {
    /** The blur's spread, in px. */
    blur: 3.5,
    /** A bar's glowing end: a touch wider than the 8px bar it caps. */
    tipRadius: 4.5,
  },

  /** A repository topic, a tinted pill in one row under the description. */
  topic: {
    height: 18,
    /** Air either side of the name, inside the pill. */
    paddingX: 8,
    gap: 6,
    /** Strong enough that a pill reads on its own. */
    opacity: 0.12,
    /** What the row adds to the card's height. */
    rowHeight: 26,
  },

  /**
   * The heat trail under the title: the mark a card is recognized by. It starts under the icon
   * and cools to nothing past the title's end.
   */
  accent: {
    height: 2,
    /** Below the title's descenders. */
    y: 8,
    /** How far the trail runs past the title, where it has faded. */
    overrun: 24,
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
 * The title icon each card wears. They are distinct on purpose: with the heat trail
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
