import { Card } from '../common/Card.ts';
import { getLightDarkColors } from '../common/color.ts';
import { kFormatter } from '../common/fmt.ts';
import { icons } from '../common/icons.ts';
import { getLanguageColor } from '../common/languageColors.ts';
import { parseEmojis } from '../common/ops.ts';
import {
  countWrappedLines,
  wrapTextMultiline,
  createLanguageNode,
  flexLayout,
  iconWithLabel,
  measureText,
  wrappedTextNode,
  wrappedTextStyles,
} from '../common/render.ts';
import type { GistData } from '../fetchers/types.ts';
import type { Child } from '../markup/index.ts';
import { el, rule } from '../markup/index.ts';

import type { CardOptions, CommonCardOptions } from './options.ts';

const ICON_SIZE = 16;
const CARD_DEFAULT_WIDTH = 400;
const X_OFFSET = 25;
const HEADER_MAX_LENGTH = 35;
const DESCRIPTION_BOX_WIDTH = CARD_DEFAULT_WIDTH - 2 * X_OFFSET;
const DESCRIPTION_FONT_SIZE = 13;
const DESCRIPTION_LINE_HEIGHT_PX = 16;
const DESCRIPTION_MAX_LINES = 10;

interface GistCardOptions extends CommonCardOptions {
  show_owner: boolean;
  browser_rendering: boolean;
}

/**
 * Render gist card.
 *
 * @returns Gist card.
 */
const renderGistCard = (gistData: GistData, options: CardOptions<GistCardOptions> = {}): string => {
  const { name, nameWithOwner, description, language, starsCount, forksCount } = gistData;
  const {
    theme = 'default_repocard',
    border_radius,
    show_owner = false,
    browser_rendering = false,
    hide_border = false,
  } = options;

  const { lightColors, darkColors } = getLightDarkColors({ ...options, theme });

  const desc = parseEmojis(description || 'No description provided');

  let descriptionLines: number;
  let descriptionSvg: Child;
  if (browser_rendering) {
    // The browser performs the actual text wrapping inside the foreignObject;
    // we only estimate the line count server-side so the SVG can reserve enough
    // height. The estimate uses measureText for font-aware widths instead of a
    // fixed character count.
    descriptionLines = countWrappedLines(
      desc,
      DESCRIPTION_FONT_SIZE,
      DESCRIPTION_BOX_WIDTH,
      DESCRIPTION_MAX_LINES,
    );

    descriptionSvg = wrappedTextNode({
      text: desc,
      x: X_OFFSET,
      y: -3,
      width: DESCRIPTION_BOX_WIDTH,
      height: descriptionLines * DESCRIPTION_LINE_HEIGHT_PX + 10, // 10px extra for "descenders" like g, j, q, p, y
      lineCount: descriptionLines,
      className: 'description',
      testId: 'description-text',
    });
  } else {
    const linesLimit = 10;
    const multiLineDescription = wrapTextMultiline(
      desc,
      DESCRIPTION_BOX_WIDTH,
      DESCRIPTION_FONT_SIZE,
      linesLimit,
    );
    descriptionLines = multiLineDescription.length;
    descriptionSvg = el(
      'text',
      { class: 'description', x: X_OFFSET, y: -5 },
      multiLineDescription.map((line) => el('tspan', { dy: '1.2em', x: X_OFFSET }, line)),
    );
  }

  const lineHeight = descriptionLines > 3 ? 12 : 10;
  const height = (descriptionLines > 1 ? 120 : 110) + descriptionLines * lineHeight;

  const totalStars = kFormatter(starsCount);
  const totalForks = kFormatter(forksCount);
  const svgStars = iconWithLabel(icons.star, totalStars, 'starsCount', ICON_SIZE);
  const svgForks = iconWithLabel(icons.fork, totalForks, 'forksCount', ICON_SIZE);

  const languageName = language || 'Unspecified';
  const languageColor = getLanguageColor(languageName);

  const svgLanguage = createLanguageNode(languageName, languageColor);

  const starAndForkCount = flexLayout({
    items: [svgLanguage, svgStars, svgForks],
    sizes: [
      measureText(languageName, 12),
      ICON_SIZE + measureText(`${totalStars}`, 12),
      ICON_SIZE + measureText(`${totalForks}`, 12),
    ],
    gap: 25,
  });

  const header = show_owner ? nameWithOwner : name;

  const card = new Card({
    defaultTitle:
      header.length > HEADER_MAX_LENGTH ? `${header.slice(0, HEADER_MAX_LENGTH)}...` : header,
    titlePrefixIcon: icons.gist,
    width: CARD_DEFAULT_WIDTH,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
  });

  card.setCSS({
    light: ({ textColor, iconColor }) => [
      rule('.description', {
        font: `400 ${DESCRIPTION_FONT_SIZE}px 'Segoe UI', Ubuntu, Sans-Serif`,
        fill: textColor,
        ...(browser_rendering ? wrappedTextStyles(textColor) : {}),
      }),
      rule('.gray', { font: "400 12px 'Segoe UI', Ubuntu, Sans-Serif", fill: textColor }),
      rule('.icon', { fill: iconColor }),
    ],
    dark: ({ textColor, iconColor }) => [
      rule('.description', {
        fill: textColor,
        ...(browser_rendering ? wrappedTextStyles(textColor) : {}),
      }),
      rule('.gray', { fill: textColor }),
      rule('.icon', { fill: iconColor }),
    ],
  });

  card.setHideBorder(hide_border);

  // `role="img"` hides the inner text from assistive tech, so everything the card
  // shows has to be repeated here.
  card.setAccessibilityLabel({
    title: card.title,
    desc: `${desc}. Language: ${languageName}, Stars: ${totalStars}, Forks: ${totalForks}`,
  });

  return card.render([
    descriptionSvg,
    el('g', { transform: `translate(30, ${height - 75})` }, starAndForkCount),
  ]);
};

export { renderGistCard };
