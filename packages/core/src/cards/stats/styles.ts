/**
 * @file The stats card's stylesheet.
 */

import { CARD_STYLE, cssComment, firefoxFontSize, font, rule } from '@stats-forge/card-kit';
import type { CssChild } from '@stats-forge/card-kit';

import { rankRingStyles } from '../../common/rankRing.ts';

/**
 * Retrieves CSS styles for a card.
 *
 * @returns Card CSS styles.
 */
const getStyles = ({
  textColor,
  titleColor,
  iconColor,
  ringColor,
  sparkColor,
  show_icons,
  progress,
}: {
  textColor: string;
  titleColor: string;
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
  cssComment('Labels recede so that the values read first.'),
  rule('.not_bold', { 'font-weight': CARD_STYLE.fontWeight.regular, opacity: 0.75 }),
  rule('.bold', { 'font-weight': CARD_STYLE.fontWeight.semibold }),
  rule('.icon', {
    fill: iconColor,
    opacity: 0.75,
    display: show_icons ? 'block' : 'none',
  }),
  ...rankRingStyles({ textColor, titleColor, ringColor, sparkColor, progress }),
];

export { getStyles };
