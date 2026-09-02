import { Card } from '../common/Card.js';
import { getLightDarkColors, isPrefixedHexColor } from '../common/color.js';
import { I18n } from '../common/I18n.js';
import { getLanguageColor } from '../common/languageColors.js';
import { clampValue, lowercaseTrim } from '../common/ops.js';
import { createProgressNode, flexLayout } from '../common/render.js';
import type { WakaTimeData, WakaTimeLang } from '../fetchers/types.js';
import type { Child, CssChild, MarkupElement } from '../markup/index.js';
import { atRule, cssComment, el, rule } from '../markup/index.js';
import { wakatimeCardLocales } from '../translations.js';

import type { CardOptions, CommonCardOptions } from './options.js';

const DEFAULT_CARD_WIDTH = 495;
const MIN_CARD_WIDTH = 250;
const COMPACT_LAYOUT_MIN_WIDTH = 400;
const DEFAULT_LINE_HEIGHT = 25;
const PROGRESSBAR_PADDING = 130;
const HIDDEN_PROGRESSBAR_PADDING = 170;
const COMPACT_LAYOUT_PROGRESSBAR_PADDING = 25;
const TOTAL_TEXT_WIDTH = 275;

/** Layouts the card can draw; the api validates `layout` against this. */
const WAKATIME_LAYOUTS = ['compact', 'normal'] as const;
type WakaTimeLayout = (typeof WAKATIME_LAYOUTS)[number];

/** How a language's time is written; the api validates `display_format` against this. */
const DISPLAY_FORMATS = ['time', 'percent'] as const;
type DisplayFormat = (typeof DISPLAY_FORMATS)[number];

interface WakaTimeOptions extends CommonCardOptions {
  locale: string;
  hide_title: boolean;
  hide: Array<string>;
  card_width: number;
  line_height: number | string;
  hide_progress: boolean;
  custom_title: string;
  layout: WakaTimeLayout;
  langs_count: number;
  display_format: DisplayFormat;
  disable_animations: boolean;
}

/**
 * Creates the no coding activity SVG node.
 *
 * @param props The function properties.
 * @param props.text No coding activity translated text.
 * @returns No coding activity SVG node string.
 */
const noCodingActivityNode = ({ text }: { text: string }): MarkupElement =>
  el('text', { x: 25, y: 11, class: 'stat bold' }, text);

/**
 * Format language value.
 *
 * @param args The function arguments.
 * @param args.lang The language object.
 * @param args.display_format The display format of the language node.
 * @returns The formatted language value.
 */
const formatLanguageValue = ({
  display_format,
  lang,
}: {
  display_format: DisplayFormat;
  lang: WakaTimeLang;
}): string => {
  return display_format === 'percent' ? `${lang.percent.toFixed(2)} %` : lang.text;
};

/**
 * Create compact WakaTime layout.
 *
 * @param args The function arguments.
 * @param args.lang The languages array.
 * @param args.x The x position of the language node.
 * @param args.y The y position of the language node.
 * @param args.display_format The display format of the language node.
 * @returns The compact layout language SVG node.
 */
const createCompactLangNode = ({
  lang,
  x,
  y,
  display_format,
}: {
  lang: WakaTimeLang;
  x: number;
  y: number;
  display_format: DisplayFormat;
}): MarkupElement => {
  if (!Number.isFinite(x)) {
    throw new Error(`Invalid x: "${x}"`);
  }
  if (!Number.isFinite(y)) {
    throw new Error(`Invalid y: "${y}"`);
  }

  const color = getLanguageColor(lang.name);
  const value = formatLanguageValue({ display_format, lang });

  return el(
    'g',
    { transform: `translate(${x}, ${y})` },
    el('circle', { cx: 5, cy: 6, r: 5, fill: color }),
    el(
      'text',
      { 'data-testid': 'lang-name', x: 15, y: 10, class: 'lang-name' },
      `${lang.name} - ${value}`,
    ),
  );
};

/**
 * Create WakaTime language text node item.
 *
 * @param args The function arguments.
 * @param args.langs The language objects.
 * @param args.y The y position of the language node.
 * @param args.display_format The display format of the language node.
 * @param args.card_width Width in px of the card.
 * @returns The language text node items.
 */
const createLanguageTextNode = ({
  langs,
  y,
  display_format,
  card_width,
}: {
  langs: Array<WakaTimeLang>;
  y: number;
  display_format: DisplayFormat;
  card_width: number;
}): Array<Child> => {
  const LEFT_X = 25;
  const RIGHT_X_BASE = 230;
  const rightOffset = (card_width - DEFAULT_CARD_WIDTH) / 2;
  const RIGHT_X = RIGHT_X_BASE + rightOffset;

  return langs.map((lang, index) => {
    const isLeft = index % 2 === 0;
    return createCompactLangNode({
      lang,
      x: isLeft ? LEFT_X : RIGHT_X,
      y: y + DEFAULT_LINE_HEIGHT * Math.floor(index / 2),
      display_format,
    });
  });
};

/**
 * Create WakaTime text item.
 *
 * @param args The function arguments.
 * @param args.id The id of the text node item.
 * @param args.label The label of the text node item.
 * @param args.value The value of the text node item.
 * @param args.index The index of the text node item.
 * @param args.percent Percentage of the text node item.
 * @param args.hideProgress Whether to hide the progress bar.
 * @param args.progressBarWidth The width of the progress bar.
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
    throw new Error(`Invalid index: "${index}"`);
  }
  if (!Number.isFinite(progressBarWidth)) {
    throw new Error(`Invalid progressBarWidth: "${progressBarWidth}"`);
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
 *
 * @param languages The languages array.
 */
const recalculatePercentages = (languages: Array<WakaTimeLang>): void => {
  const totalSum = languages.reduce((totalSum, language) => totalSum + language.percent, 0);
  const weight = +(100 / totalSum).toFixed(2);
  languages.forEach((language) => {
    language.percent = +(language.percent * weight).toFixed(2);
  });
};

/**
 * Retrieves CSS styles for a card.
 *
 * @param colors The colors to use for the card.
 * @param colors.textColor The text color.
 * @returns Card CSS styles.
 */
const getStyles = ({ textColor }: { textColor: string }): Array<CssChild> => {
  if (!isPrefixedHexColor(textColor)) {
    throw new Error(`Invalid text color: "${textColor}"`);
  }

  return [
    rule('.stat', {
      font: `600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif`,
      fill: textColor,
    }),
    atRule(
      '@supports(-moz-appearance: auto)',
      cssComment('Selector detects Firefox'),
      rule('.stat', { 'font-size': '12px' }),
    ),
    rule('.stagger', { opacity: 0, animation: 'fadeInAnimation 0.3s ease-in-out forwards' }),
    rule('.not_bold', { 'font-weight': 400 }),
    rule('.bold', { 'font-weight': 700 }),
  ];
};

/** A bar the same color as the text behind it would be invisible, so it goes transparent. */
const progressBackground = (titleColor: string, textColor: string): string =>
  textColor === titleColor ? '#fff0' : textColor;

/**
 * Normalize incoming width (string or number) and clamp to minimum.
 *
 * @param args The function arguments.
 * @param args.layout The incoming layout value.
 * @param args.value The incoming width value.
 * @returns The normalized width value.
 */
const normalizeCardWidth = ({
  value,
  layout,
}: {
  value?: number | undefined;
  layout?: WakaTimeLayout | undefined;
}): number => {
  if (value === undefined || isNaN(value)) {
    return DEFAULT_CARD_WIDTH;
  }
  return Math.max(layout === 'compact' ? COMPACT_LAYOUT_MIN_WIDTH : MIN_CARD_WIDTH, value);
};

/**
 * Renders WakaTime card.
 *
 * @param stats WakaTime stats.
 * @param options Card options.
 * @returns WakaTime card SVG.
 */
const renderWakatimeCard = (
  stats: Partial<WakaTimeData> = {},
  options: CardOptions<WakaTimeOptions> = { hide: [] },
): string => {
  let { languages = [] } = stats;
  const {
    hide_title = false,
    hide_border = false,
    card_width,
    hide,
    line_height = DEFAULT_LINE_HEIGHT,
    hide_progress,
    custom_title,
    locale,
    layout,
    langs_count = languages.length,
    border_radius,
    display_format = 'time',
    disable_animations,
  } = options;

  const normalizedWidth = normalizeCardWidth({ value: card_width, layout });

  const shouldHideLangs = Array.isArray(hide) && hide.length > 0;
  if (shouldHideLangs) {
    const languagesToHide = new Set(hide.map((lang) => lowercaseTrim(lang)));
    languages = languages.filter((lang) => !languagesToHide.has(lowercaseTrim(lang.name)));
  }

  // Since the percentages are sorted in descending order, we can just
  // slice from the beginning without sorting.
  languages = languages.slice(0, langs_count);
  recalculatePercentages(languages);

  const i18n = new I18n({
    locale,
    translations: wakatimeCardLocales,
  });

  const lheight = parseInt(String(line_height), 10);

  const langsCount = clampValue(langs_count, 1, langs_count);

  const { lightColors, darkColors } = getLightDarkColors(options);

  const filteredLanguages = languages
    .filter((language) => language.hours || language.minutes)
    .slice(0, langsCount);

  // Calculate the card height depending on how many items there are
  // but if rank circle is visible clamp the minimum height to `150`
  let height = Math.max(45 + (filteredLanguages.length + 1) * lheight, 150);

  let finalLayout: Child;

  // RENDER COMPACT LAYOUT
  if (layout === 'compact') {
    const width = normalizedWidth - 5;
    height = 90 + Math.round(filteredLanguages.length / 2) * DEFAULT_LINE_HEIGHT;

    // progressOffset holds the previous language's width and used to offset the next language
    // so that we can stack them one after another, like this: [--][----][---]
    let progressOffset = 0;
    const compactProgressBar = filteredLanguages.map((language) => {
      const progress = ((width - COMPACT_LAYOUT_PROGRESSBAR_PADDING) * language.percent) / 100;
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
          width: width - 2 * COMPACT_LAYOUT_PROGRESSBAR_PADDING,
          height: 8,
          fill: 'white',
          rx: 5,
        }),
      ),
      compactProgressBar,
      filteredLanguages.length
        ? createLanguageTextNode({
            y: 25,
            langs: filteredLanguages,
            display_format,
            card_width: normalizedWidth,
          })
        : noCodingActivityNode({
            text: stats.is_coding_activity_visible
              ? stats.is_other_usage_visible
                ? i18n.t('wakatimecard.nocodingactivity')
                : i18n.t('wakatimecard.nocodedetails')
              : i18n.t('wakatimecard.notpublic'),
          }),
    ];
  } else {
    finalLayout = flexLayout({
      items: filteredLanguages.length
        ? filteredLanguages.map((language, index) => {
            return createTextNode({
              id: language.name,
              label: language.name,
              value: formatLanguageValue({ display_format, lang: language }),
              index,
              percent: language.percent,
              hideProgress: hide_progress,
              progressBarWidth: normalizedWidth - TOTAL_TEXT_WIDTH,
            });
          })
        : [
            noCodingActivityNode({
              text: stats.is_coding_activity_visible
                ? stats.is_other_usage_visible
                  ? i18n.t('wakatimecard.nocodingactivity')
                  : i18n.t('wakatimecard.nocodedetails')
                : i18n.t('wakatimecard.notpublic'),
            }),
          ],
      gap: lheight,
      direction: 'column',
    });
  }

  // Get title range text
  let titleText = i18n.t('wakatimecard.title');
  switch (stats.range) {
    case 'last_7_days':
      titleText += ` (${i18n.t('wakatimecard.last7days')})`;
      break;
    case 'last_year':
      titleText += ` (${i18n.t('wakatimecard.lastyear')})`;
      break;
  }

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: titleText,
    width: normalizedWidth,
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
        // Invalid on purpose: browsers drop it and animate to the rect's own width,
        // which is the reveal the mask wants. See the changeset.
        rule('to', { width: 'calc(100%-100px)' }),
      ),
      atRule(
        '@keyframes growWidthAnimation',
        rule('from', { width: 0 }),
        rule('to', { width: '100%' }),
      ),
      rule('.lang-name', { font: "400 11px 'Segoe UI', Ubuntu, Sans-Serif", fill: textColor }),
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
    desc: filteredLanguages.length
      ? filteredLanguages
          .map((lang) => `${lang.name}: ${formatLanguageValue({ display_format, lang })}`)
          .join(', ')
      : i18n.t('wakatimecard.nocodingactivity'),
  });

  return card.render(el('svg', { x: 0, y: 0, width: '100%' }, finalLayout));
};

export { DISPLAY_FORMATS, WAKATIME_LAYOUTS, renderWakatimeCard };
