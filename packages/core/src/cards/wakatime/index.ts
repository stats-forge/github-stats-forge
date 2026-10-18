import { CARD_ICON, CARD_STYLE, firefoxFontSize, font } from '../../common/brand.ts';
import { Card } from '../../common/Card.ts';
import { getLightDarkColors, isPrefixedHexColor } from '../../common/color.ts';
import { getLanguageColor } from '../../common/languageColors.ts';
import { commonLocales } from '../../common/locales.ts';
import { localize } from '../../common/localize.ts';
import { clampValue, lowercaseTrim } from '../../common/ops.ts';
import { createProgressNode, flexLayout } from '../../common/render.ts';
import { measureText } from '../../common/text.ts';
import type { WakaTimeData, WakaTimeLang } from '../../fetchers/types.ts';
import type { Child, CssChild, MarkupElement } from '../../markup/index.ts';
import { atRule, el, rule } from '../../markup/index.ts';
import type { CardOptions, CommonCardOptions } from '../options.ts';

import { wakatimeCardLocales } from './locales.ts';

const DEFAULT_CARD_WIDTH = CARD_STYLE.width.wide;
const MIN_CARD_WIDTH = 250;
const COMPACT_LAYOUT_MIN_WIDTH = 400;
const LINE_HEIGHT = 25;
/**
 * The compact layout's own floor: the body offset, one row of ink and `CARD_STYLE.padding.bottom`,
 * with the rows themselves added on top.
 */
const COMPACT_LAYOUT_BASE_HEIGHT = 86;
const PROGRESSBAR_PADDING = 130;
const HIDDEN_PROGRESSBAR_PADDING = 170;
const COMPACT_LAYOUT_PROGRESSBAR_PADDING = 25;
const TOTAL_TEXT_WIDTH = 275;
const COMPACT_LEFT_X = 25;
/** Where the right column sits on a default-width card, while the left column leaves it room. */
const COMPACT_RIGHT_X = 230;
/** Where a compact row's label starts, clear of its dot. */
const COMPACT_LABEL_X = 15;
/** Air between the left column's widest label and the right column. */
const COMPACT_COLUMN_AIR = 5;

/** Layouts the card can draw; the api validates `layout` against this. */
const WAKATIME_LAYOUTS = ['compact', 'normal'] as const;
type WakaTimeLayout = (typeof WAKATIME_LAYOUTS)[number];

/** How a language's time is written; the api validates `value_format` against this. */
const VALUE_FORMATS = ['time', 'percent'] as const;
type ValueFormat = (typeof VALUE_FORMATS)[number];

interface WakaTimeOptions extends CommonCardOptions {
  locale: string;
  hide_title: boolean;
  hide_langs: Array<string>;
  card_width: number;
  hide_progress: boolean;
  title: string;
  layout: WakaTimeLayout;
  langs_count: number;
  value_format: ValueFormat;
  disable_animations: boolean;
}

/**
 * Creates the no coding activity SVG node.
 *
 * @returns No coding activity SVG node string.
 */
const noCodingActivityNode = ({ text }: { text: string }): MarkupElement =>
  el('text', { x: 25, y: 11, class: 'stat bold' }, text);

/**
 * Format language value.
 *
 * @returns The formatted language value.
 */
const formatLanguageValue = ({
  value_format,
  lang,
}: {
  value_format: ValueFormat;
  lang: WakaTimeLang;
}): string => {
  if (value_format === 'percent') {
    return `${lang.percent.toFixed(2)} %`;
  }

  return lang.text;
};

/**
 * The text a compact row draws for a language.
 *
 * @returns The language's name and its value.
 */
const compactLabel = (lang: WakaTimeLang, value_format: ValueFormat): string =>
  `${lang.name} - ${formatLanguageValue({ value_format, lang })}`;

/**
 * Places the compact layout's right column clear of the left column's widest label.
 *
 * @returns The right column's x, and the card width both columns need.
 */
const measureCompactColumns = ({
  langs,
  value_format,
  width,
}: {
  langs: Array<WakaTimeLang>;
  value_format: ValueFormat;
  width: number;
}): { rightX: number; width: number } => {
  const widest = (column: Array<WakaTimeLang>): number =>
    Math.max(
      0,
      ...column.map(
        (lang) =>
          COMPACT_LABEL_X +
          measureText(compactLabel(lang, value_format), CARD_STYLE.fontSize.micro),
      ),
    );
  const left = langs.filter((_, index) => index % 2 === 0);
  const right = langs.filter((_, index) => index % 2 === 1);
  const rightX = Math.max(
    COMPACT_RIGHT_X + (width - DEFAULT_CARD_WIDTH) / 2,
    COMPACT_LEFT_X + widest(left) + COMPACT_COLUMN_AIR,
  );
  return {
    rightX,
    width: Math.max(width, Math.ceil(rightX + widest(right) + CARD_STYLE.padding.x)),
  };
};

/**
 * Create compact WakaTime layout.
 *
 * @returns The compact layout language SVG node.
 */
const createCompactLangNode = ({
  lang,
  x,
  y,
  value_format,
}: {
  lang: WakaTimeLang;
  x: number;
  y: number;
  value_format: ValueFormat;
}): MarkupElement => {
  if (!Number.isFinite(x)) {
    throw new TypeError(`Invalid x: "${x}"`);
  }
  if (!Number.isFinite(y)) {
    throw new TypeError(`Invalid y: "${y}"`);
  }

  const color = getLanguageColor(lang.name);

  return el(
    'g',
    { transform: `translate(${x}, ${y})` },
    el('circle', { cx: 5, cy: 6, r: 5, fill: color }),
    el(
      'text',
      { 'data-testid': 'lang-name', x: COMPACT_LABEL_X, y: 10, class: 'lang-name' },
      compactLabel(lang, value_format),
    ),
  );
};

/**
 * Create WakaTime language text node item.
 *
 * @returns The language text node items.
 */
const createLanguageTextNode = ({
  langs,
  y,
  value_format,
  rightX,
}: {
  langs: Array<WakaTimeLang>;
  y: number;
  value_format: ValueFormat;
  rightX: number;
}): Array<Child> =>
  langs.map((lang, index) => {
    const isLeft = index % 2 === 0;
    return createCompactLangNode({
      lang,
      x: isLeft ? COMPACT_LEFT_X : rightX,
      y: y + LINE_HEIGHT * Math.floor(index / 2),
      value_format,
    });
  });

/**
 * Create WakaTime text item.
 *
 * @returns The text SVG node.
 */
const createTextNode = ({
  id,
  label,
  value,
  index,
  percent,
  hideProgress,
  progressBarWidth,
}: {
  id: string;
  label: string;
  value: string;
  index: number;
  percent: number;
  hideProgress?: boolean | undefined;
  progressBarWidth: number;
}): MarkupElement => {
  if (!Number.isFinite(index)) {
    throw new TypeError(`Invalid index: "${index}"`);
  }
  if (!Number.isFinite(progressBarWidth)) {
    throw new TypeError(`Invalid progressBarWidth: "${progressBarWidth}"`);
  }

  const staggerDelay = (index + 3) * 150;

  return el(
    'g',
    {
      class: 'stagger',
      style: `animation-delay: ${staggerDelay}ms`,
      transform: 'translate(25, 0)',
    },
    el('text', { class: 'stat bold', y: 12.5, 'data-testid': id }, `${label}:`),
    el(
      'text',
      {
        class: 'stat',
        x: hideProgress ? HIDDEN_PROGRESSBAR_PADDING : PROGRESSBAR_PADDING + progressBarWidth,
        y: 12.5,
      },
      value,
    ),
    !hideProgress &&
      createProgressNode({
        x: 110,
        y: 4,
        progress: percent,
        width: progressBarWidth,
        delay: staggerDelay + 300,
      }),
  );
};

/**
 * Recalculating percentages so that, compact layout's progress bar does not break when
 * hiding languages.
 */
const recalculatePercentages = (languages: Array<WakaTimeLang>): void => {
  const totalSum = languages.reduce((sum, language) => sum + language.percent, 0);
  const weight = Number((100 / totalSum).toFixed(2));
  for (const language of languages) {
    language.percent = Number((language.percent * weight).toFixed(2));
  }
};

/**
 * Retrieves CSS styles for a card.
 *
 * @returns Card CSS styles.
 */
const getStyles = ({ textColor }: { textColor: string }): Array<CssChild> => {
  if (!isPrefixedHexColor(textColor)) {
    throw new Error(`Invalid text color: "${textColor}"`);
  }

  return [
    rule('.stat', {
      font: font('regular', 'body'),
      fill: textColor,
    }),
    firefoxFontSize(['.stat'], 'small'),
    rule('.stagger', { opacity: 0, animation: 'fadeInAnimation 0.3s ease-in-out forwards' }),
    rule('.not_bold', { 'font-weight': CARD_STYLE.fontWeight.regular }),
    rule('.bold', { 'font-weight': CARD_STYLE.fontWeight.semibold }),
  ];
};

/** A bar the same color as the text behind it would be invisible, so it goes transparent. */
const progressBackground = (titleColor: string, textColor: string): string => {
  if (textColor === titleColor) {
    return '#fff0';
  }

  return textColor;
};

/**
 * Normalize incoming width (string or number) and clamp to minimum.
 *
 * @returns The normalized width value.
 */
const normalizeCardWidth = ({
  value,
  layout,
}: {
  value?: number | undefined;
  layout?: WakaTimeLayout | undefined;
}): number => {
  if (value === undefined || Number.isNaN(value)) {
    return DEFAULT_CARD_WIDTH;
  }
  return Math.max(layout === 'compact' ? COMPACT_LAYOUT_MIN_WIDTH : MIN_CARD_WIDTH, value);
};

/**
 * Renders WakaTime card.
 *
 * @returns WakaTime card SVG.
 */
const renderCard = (
  stats: Partial<WakaTimeData> = {},
  options: CardOptions<WakaTimeOptions> = {},
): string => {
  let { languages = [] } = stats;
  const {
    hide_title = false,
    hide_border = false,
    card_width,
    hide_langs,
    hide_progress,
    title,
    locale,
    layout,
    langs_count = languages.length,
    border_radius,
    value_format = 'time',
    disable_animations,
  } = options;

  let width = normalizeCardWidth({ value: card_width, layout });

  const shouldHideLangs = Array.isArray(hide_langs) && hide_langs.length > 0;
  if (shouldHideLangs) {
    const languagesToHide = new Set(hide_langs.map((lang) => lowercaseTrim(lang)));
    languages = languages.filter((lang) => !languagesToHide.has(lowercaseTrim(lang.name)));
  }

  // Since the percentages are sorted in descending order, we can just
  // slice from the beginning without sorting.
  languages = languages.slice(0, langs_count);
  recalculatePercentages(languages);

  const t = localize(wakatimeCardLocales, locale);
  const commonT = localize(commonLocales, locale);

  const langsCount = clampValue(langs_count, 1, langs_count);

  const { lightColors, darkColors } = getLightDarkColors(options);

  const filteredLanguages = languages
    .filter((language) => language.hours || language.minutes)
    .slice(0, langsCount);

  // A short language list would otherwise draw a stub card, so 150 is the floor.
  let height = Math.max(
    CARD_STYLE.padding.bodyOffsetY +
      Math.max(filteredLanguages.length - 1, 0) * LINE_HEIGHT +
      CARD_STYLE.statRowInk +
      CARD_STYLE.padding.bottom,
    150,
  );

  let finalLayout: Child;

  // RENDER COMPACT LAYOUT
  if (layout === 'compact') {
    const columns = measureCompactColumns({ langs: filteredLanguages, value_format, width });
    ({ width } = columns);
    const barWidth = width - 2 * COMPACT_LAYOUT_PROGRESSBAR_PADDING;
    height = COMPACT_LAYOUT_BASE_HEIGHT + Math.round(filteredLanguages.length / 2) * LINE_HEIGHT;

    // progressOffset holds the previous language's width and used to offset the next language
    // so that we can stack them one after another, like this: [--][----][---]
    let progressOffset = COMPACT_LAYOUT_PROGRESSBAR_PADDING;
    const compactProgressBar = filteredLanguages.map((language) => {
      const progress = (barWidth * language.percent) / 100;
      const x = progressOffset;
      progressOffset += progress;

      return el('rect', {
        mask: 'url(#rect-mask)',
        'data-testid': 'lang-progress',
        x,
        y: 0,
        width: progress,
        height: 8,
        fill: getLanguageColor(language.name),
      });
    });

    finalLayout = [
      el(
        'mask',
        { id: 'rect-mask' },
        el('rect', {
          x: COMPACT_LAYOUT_PROGRESSBAR_PADDING,
          y: 0,
          width: barWidth,
          height: 8,
          fill: 'white',
          rx: 5,
        }),
      ),
      compactProgressBar,
      filteredLanguages.length > 0
        ? createLanguageTextNode({
            y: 25,
            langs: filteredLanguages,
            value_format,
            rightX: columns.rightX,
          })
        : noCodingActivityNode({
            text: stats.is_coding_activity_visible
              ? stats.is_other_usage_visible
                ? t.noCodingActivity()
                : t.noCodeDetails()
              : t.notPublic(),
          }),
    ];
  } else {
    finalLayout = flexLayout({
      items:
        filteredLanguages.length > 0
          ? filteredLanguages.map((language, index) =>
              createTextNode({
                id: language.name,
                label: language.name,
                value: formatLanguageValue({ value_format, lang: language }),
                index,
                percent: language.percent,
                hideProgress: hide_progress,
                progressBarWidth: width - TOTAL_TEXT_WIDTH,
              }),
            )
          : [
              noCodingActivityNode({
                text: stats.is_coding_activity_visible
                  ? stats.is_other_usage_visible
                    ? t.noCodingActivity()
                    : t.noCodeDetails()
                  : t.notPublic(),
              }),
            ],
      gap: LINE_HEIGHT,
      direction: 'column',
    });
  }

  // Get title range text
  let titleText = t.title();
  switch (stats.range) {
    case 'last_7_days':
      titleText += ` (${t.last7Days()})`;
      break;

    case 'last_year':
      titleText += ` (${commonT.lastYear()})`;
      break;

    default:
      break;
  }

  const card = new Card({
    customTitle: title,
    defaultTitle: titleText,
    titlePrefixIcon: CARD_ICON.wakatime,
    width,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
  });

  if (disable_animations) {
    card.disableAnimations();
  }

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  card.setCSS({
    light: ({ titleColor, textColor }) => [
      getStyles({ textColor }),
      atRule(
        '@keyframes slideInAnimation',
        rule('from', { width: 0 }),
        // Invalid on purpose — `calc` needs spaces around its `-`. Browsers drop the
        // declaration and animate to the rect's own width, which is the reveal the mask wants.
        rule('to', { width: 'calc(100%-100px)' }),
      ),
      atRule(
        '@keyframes growWidthAnimation',
        rule('from', { width: 0 }),
        rule('to', { width: '100%' }),
      ),
      rule('.lang-name', { font: font('regular', 'micro'), fill: textColor }),
      rule('#rect-mask rect', { animation: 'slideInAnimation 1s ease-in-out forwards' }),
      rule('.lang-progress', {
        animation: 'growWidthAnimation 0.6s ease-in-out forwards',
        fill: titleColor,
      }),
      rule('.progress-background', { fill: progressBackground(titleColor, textColor) }),
    ],
    dark: ({ titleColor, textColor }) => [
      getStyles({ textColor }),
      rule('.lang-name', { fill: textColor }),
      rule('.lang-progress', { fill: titleColor }),
      rule('.progress-background', { fill: progressBackground(titleColor, textColor) }),
    ],
  });

  // `role="img"` hides the inner text from assistive tech, so everything the card
  // shows has to be repeated here.
  card.setAccessibilityLabel({
    title: card.title,
    desc:
      filteredLanguages.length > 0
        ? filteredLanguages
            .map((lang) => `${lang.name}: ${formatLanguageValue({ value_format, lang })}`)
            .join(', ')
        : t.noCodingActivity(),
  });

  return card.render(el('svg', { x: 0, y: 0, width: '100%' }, finalLayout));
};

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * They ride on the renderer so a list cannot be found without what draws it;
 * the api handler forwards them onto its own export, which is what a UI reads.
 */
const renderWakatimeCard = Object.assign(renderCard, {
  OPTIONS: {
    layout: WAKATIME_LAYOUTS,
    value_format: VALUE_FORMATS,
  },
});

export { renderWakatimeCard };
