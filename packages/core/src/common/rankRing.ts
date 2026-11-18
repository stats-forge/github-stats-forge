/**
 * @file The rank ring the stats and organization cards draw, its glyphs and its stylesheet.
 */

import {
  atRule,
  CARD_STYLE,
  cssComment,
  el,
  font,
  glowingCircle,
  rule,
} from '@stats-forge/card-kit';
import type { Child, CssChild } from '@stats-forge/card-kit';

/** Rank indicators a card can draw; the api validates `rank_icon` against this. */
const RANK_ICONS = ['default', 'github', 'percentile'] as const;
type RankIcon = (typeof RANK_ICONS)[number];

/** The ring, and the sparks that rise off it. */
const RANK_RING = {
  radius: 40,
  stroke: 6,
  /** The track behind the ring, a tint of the text so it reads on any background. */
  trackOpacity: 0.12,
  /** How far a spark rises before it has burnt out, in px. */
  sparkRise: 56,
  /** Enough to notice; a README stacking cards should not flicker forever. */
  sparkCycles: 3,
} as const;

/** Room the ring needs at the right edge, so a value never runs into it. */
const RANK_GUTTER = 120;
/** The ring's own `cx`, which its group's translation has to make up for. */
const RANK_CIRCLE_CX_OFFSET = 10;
/** Where each spark leaves the ring's foot, as `[dx, dy, delay in s]`; uneven, so they read as embers. */
const SPARKS: ReadonlyArray<readonly [number, number, number]> = [
  [-26, -6, 0],
  [-10, 0, 1.1],
  [4, -4, 2.2],
  [18, 2, 0.6],
  [30, -8, 1.7],
];

/** Attributes every rank glyph shares, so the three variants differ only where they mean to. */
const RANK_TEXT = {
  x: -5,
  'alignment-baseline': 'central',
  'dominant-baseline': 'central',
  'text-anchor': 'middle',
} as const;

/**
 * @returns The glyph drawn inside the ring.
 */
const rankIcon = (
  kind: RankIcon,
  rankLevel: string,
  /** The percentile's two lines, in the card's locale; `value` is written without its `%`. */
  percentile: { header: string; value: string },
): Child => {
  switch (kind) {
    case 'github':
      return el(
        'svg',
        {
          x: -38,
          y: -30,
          height: 66,
          width: 66,
          'aria-hidden': 'true',
          viewBox: '0 0 16 16',
          version: '1.1',
          'data-view-component': 'true',
          'data-testid': 'github-rank-icon',
        },
        el('path', {
          d: 'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z',
        }),
      );

    case 'percentile':
      return [
        el(
          'text',
          {
            ...RANK_TEXT,
            y: -12,
            'data-testid': 'percentile-top-header',
            class: 'rank-percentile-header',
          },
          percentile.header,
        ),
        el(
          'text',
          {
            ...RANK_TEXT,
            y: 12,
            'data-testid': 'percentile-rank-value',
            class: 'rank-percentile-text',
          },
          `${percentile.value}%`,
        ),
      ];

    case 'default':
    default:
      return el('text', { ...RANK_TEXT, y: 3, 'data-testid': 'level-rank-icon' }, rankLevel);
  }
};

/**
 * Draws the ring with its glyph and sparks, centred on `x` and `y`.
 *
 * @returns The ring's group.
 */
const rankRing = ({
  x,
  y,
  icon,
  level,
  percentile,
}: {
  x: number;
  y: number;
  icon: RankIcon;
  level: string;
  percentile: { header: string; value: string };
}): Child =>
  el(
    'g',
    {
      'data-testid': 'rank-circle',
      transform: `translate(${x + RANK_CIRCLE_CX_OFFSET}, ${y - 8})`,
    },
    el('circle', {
      class: 'rank-circle-rim',
      cx: -RANK_CIRCLE_CX_OFFSET,
      cy: 8,
      r: RANK_RING.radius,
    }),
    glowingCircle('rank-ring', {
      class: 'rank-circle',
      cx: -RANK_CIRCLE_CX_OFFSET,
      cy: 8,
      r: RANK_RING.radius,
    }),
    el('g', { class: 'rank-text' }, rankIcon(icon, level, percentile)),
    SPARKS.map(([dx, dy, delay]) =>
      el('circle', {
        class: 'spark',
        cx: -RANK_CIRCLE_CX_OFFSET + dx,
        cy: 8 + RANK_RING.radius + dy,
        r: 1.7,
        style: `animation-delay: ${String(delay)}s`,
      }),
    ),
  );

/**
 * @returns The length of the ring left undrawn at `value`, out of 100.
 */
const calculateCircleProgress = (value: number): number => {
  const { radius } = RANK_RING;
  const circumference = Math.PI * (radius * 2);
  const clamped = Math.min(Math.max(value, 0), 100);

  return ((100 - clamped) / 100) * circumference;
};

/**
 * The ring's stylesheet; `progress` is how much of it is drawn, out of 100.
 *
 * @returns Ring CSS styles.
 */
const rankRingStyles = ({
  textColor,
  titleColor,
  ringColor,
  sparkColor,
  progress,
}: {
  textColor: string;
  titleColor: string;
  ringColor: string;
  sparkColor: string;
  progress: number;
}): Array<CssChild> => [
  rule('.rank-text', {
    font: font('bold', 'display'),
    fill: titleColor,
    transform: 'translate(-5px, 5px)',
    animation: 'scaleInAnimation 0.3s ease-in-out backwards',
  }),
  rule('.rank-percentile-header', { 'font-size': `${String(CARD_STYLE.fontSize.body)}px` }),
  rule('.rank-percentile-text', { 'font-size': `${String(CARD_STYLE.fontSize.lead)}px` }),
  rule('.rank-circle-rim', {
    stroke: textColor,
    fill: 'none',
    'stroke-width': RANK_RING.stroke,
    opacity: RANK_RING.trackOpacity,
  }),
  rule('.rank-circle', {
    stroke: ringColor,
    'stroke-dasharray': 2 * Math.PI * RANK_RING.radius,
    fill: 'none',
    'stroke-width': RANK_RING.stroke,
    'stroke-linecap': 'round',
    opacity: 1,
    'transform-origin': '-10px 8px',
    transform: 'rotate(-90deg)',
    'stroke-dashoffset': calculateCircleProgress(progress),
    animation: 'rankAnimation 0.8s backwards ease-in-out',
  }),
  atRule(
    '@keyframes rankAnimation',
    rule('from', { 'stroke-dashoffset': calculateCircleProgress(0) }),
    rule('to', { 'stroke-dashoffset': calculateCircleProgress(progress) }),
  ),
  cssComment('A spark burns out at the top of its rise, so its resting frame is unlit.'),
  rule('.spark', {
    fill: sparkColor,
    opacity: 0,
    animation: `sparkAnimation 3.4s ease-out ${String(RANK_RING.sparkCycles)} backwards`,
  }),
  atRule(
    '@keyframes sparkAnimation',
    rule('0%', { opacity: 0, transform: 'translateY(0)' }),
    rule('15%', { opacity: 1 }),
    rule('100%', { opacity: 0, transform: `translateY(-${String(RANK_RING.sparkRise)}px)` }),
  ),
];

export { RANK_GUTTER, RANK_ICONS, rankRing, rankRingStyles };
export type { RankIcon };
