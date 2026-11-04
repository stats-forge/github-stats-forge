/**
 * @file The stats card's stylesheet, the rank ring's animation included.
 */

import { CARD_STYLE, firefoxFontSize, font } from '../../common/brand.ts';
import type { CssChild } from '../../markup/index.ts';
import { atRule, cssComment, rule } from '../../markup/index.ts';

/** The rank ring, and the sparks that rise off it. */
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

/**
 * Calculates progress along the boundary of the circle, i.e. its circumference.
 *
 * @returns Progress value.
 */
const calculateCircleProgress = (value: number): number => {
  const { radius } = RANK_RING;
  const circumference = Math.PI * (radius * 2);
  const clamped = Math.min(Math.max(value, 0), 100);

  return ((100 - clamped) / 100) * circumference;
};

/**
 * Retrieves the animation to display progress along the circumference of circle
 * from the beginning to the given value in a clockwise direction.
 *
 * @returns Progress animation css.
 */
const getProgressAnimation = ({ progress }: { progress: number }): CssChild =>
  atRule(
    '@keyframes rankAnimation',
    rule('from', { 'stroke-dashoffset': calculateCircleProgress(0) }),
    rule('to', { 'stroke-dashoffset': calculateCircleProgress(progress) }),
  );

/**
 * Retrieves CSS styles for a card.
 *
 * @returns Card CSS styles.
 */
const getStyles = ({
  textColor,
  iconColor,
  ringColor,
  sparkColor,
  show_icons,
  progress,
}: {
  textColor: string;
  iconColor: string;
  ringColor: string;
  sparkColor: string;
  show_icons: boolean;
  progress: number;
}): Array<CssChild> => [
  rule('.stat', {
    font: font('regular', 'body'),
    fill: textColor,
    'font-variant-numeric': 'tabular-nums',
  }),
  firefoxFontSize(['.stat'], 'small'),
  rule('.stagger', { animation: 'fadeInAnimation 0.3s ease-in-out backwards' }),
  rule('.rank-text', {
    font: font('bold', 'display'),
    fill: ringColor,
    transform: 'translate(-5px, 5px)',
    animation: 'scaleInAnimation 0.3s ease-in-out backwards',
  }),
  rule('.rank-percentile-header', { 'font-size': `${String(CARD_STYLE.fontSize.body)}px` }),
  rule('.rank-percentile-text', { 'font-size': `${String(CARD_STYLE.fontSize.lead)}px` }),
  cssComment('Labels recede so that the values read first.'),
  rule('.not_bold', { 'font-weight': CARD_STYLE.fontWeight.regular, opacity: 0.75 }),
  rule('.bold', { 'font-weight': CARD_STYLE.fontWeight.semibold }),
  rule('.icon', {
    fill: iconColor,
    opacity: 0.75,
    display: show_icons ? 'block' : 'none',
  }),
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
  getProgressAnimation({ progress }),
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

export { RANK_RING, getStyles };
