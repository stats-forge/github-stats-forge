/**
 * @file The stats card's stylesheet, the rank ring's animation included.
 */

import { CARD_STYLE, firefoxFontSize, font } from '../../common/brand.ts';
import type { CssChild } from '../../markup/index.ts';
import { atRule, cssComment, rule } from '../../markup/index.ts';

/**
 * Calculates progress along the boundary of the circle, i.e. its circumference.
 *
 * @returns Progress value.
 */
const calculateCircleProgress = (value: number): number => {
  const radius = 40;
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
  show_icons,
  progress,
}: {
  textColor: string;
  iconColor: string;
  ringColor: string;
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
    fill: textColor,
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
    stroke: ringColor,
    fill: 'none',
    'stroke-width': 4,
    opacity: 0.15,
  }),
  rule('.rank-circle', {
    stroke: ringColor,
    'stroke-dasharray': 250,
    fill: 'none',
    'stroke-width': 4,
    'stroke-linecap': 'round',
    opacity: 1,
    'transform-origin': '-10px 8px',
    transform: 'rotate(-90deg)',
    'stroke-dashoffset': calculateCircleProgress(progress),
    animation: 'rankAnimation 0.8s backwards ease-in-out',
  }),
  getProgressAnimation({ progress }),
];

export { getStyles };
