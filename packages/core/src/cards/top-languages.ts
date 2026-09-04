import { Card } from '../common/Card.ts';
import { getLightDarkColors, isPrefixedHexColor } from '../common/color.ts';
import { formatBytes } from '../common/fmt.ts';
import { I18n } from '../common/I18n.ts';
import { DEFAULT_LANG_COLOR } from '../common/languageColors.ts';
import { chunkArray, clampValue, lowercaseTrim } from '../common/ops.ts';
import { createProgressNode, flexLayout, measureText } from '../common/render.ts';
import type { Lang, TopLangData } from '../fetchers/types.ts';
import type { Child, MarkupElement } from '../markup/index.ts';
import { atRule, cssComment, el, rule } from '../markup/index.ts';
import { langCardLocales } from '../translations.ts';

import type { CardOptions, CommonCardOptions } from './options.ts';

const DEFAULT_CARD_WIDTH = 300;
const MIN_CARD_WIDTH = 280;
const CARD_PADDING = 25;
const COMPACT_LAYOUT_BASE_HEIGHT = 90;
const MAXIMUM_LANGS_COUNT = 20;

const NORMAL_LAYOUT_DEFAULT_LANGS_COUNT = 5;
const COMPACT_LAYOUT_DEFAULT_LANGS_COUNT = 6;
const DONUT_LAYOUT_DEFAULT_LANGS_COUNT = 5;
const PIE_LAYOUT_DEFAULT_LANGS_COUNT = 6;
const DONUT_VERTICAL_LAYOUT_DEFAULT_LANGS_COUNT = 6;

/** Layouts the card can draw; the api validates `layout` against this. */
const TOP_LANG_LAYOUTS = ['compact', 'normal', 'donut', 'donut-vertical', 'pie'] as const;
type TopLangLayout = (typeof TOP_LANG_LAYOUTS)[number];

/** How a language's value is shown; the api validates `stats_format` against this. */
const TOP_LANG_STATS_FORMATS = ['percentages', 'bytes'] as const;
type TopLangStatsFormat = (typeof TOP_LANG_STATS_FORMATS)[number];

interface TopLangOptions extends CommonCardOptions {
  locale: string;
  hide_title: boolean;
  card_width: number;
  hide: Array<string>;
  layout: TopLangLayout;
  custom_title: string;
  langs_count: number;
  disable_animations: boolean;
  hide_progress: boolean;
  hide_values: boolean;
  prog_bar_bg_color: string;
  stats_format: TopLangStatsFormat;
}

/**
 * Retrieves the programming language whose name is the longest.
 *
 * @returns Longest programming language object.
 */
const getLongestLang = (arr: Array<Lang>): Pick<Lang, 'name' | 'size' | 'color'> => {
  let longest: Pick<Lang, 'name' | 'size' | 'color'> = { name: '', size: 0, color: '' };
  for (const lang of arr) {
    if (lang.name.length > longest.name.length) {
      longest = lang;
    }
  }
  return longest;
};

/**
 * Convert degrees to radians.
 *
 * @returns Angle in radians.
 */
const degreesToRadians = (angleInDegrees: number): number => angleInDegrees * (Math.PI / 180);

/**
 * Convert radians to degrees.
 *
 * @returns Angle in degrees.
 */
const radiansToDegrees = (angleInRadians: number): number => angleInRadians / (Math.PI / 180);

/**
 * Convert polar coordinates to cartesian coordinates.
 *
 * @returns Cartesian coordinates.
 */
const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } => {
  const rads = degreesToRadians(angleInDegrees);
  return {
    x: centerX + radius * Math.cos(rads),
    y: centerY + radius * Math.sin(rads),
  };
};

/**
 * Convert cartesian coordinates to polar coordinates.
 *
 * @returns Polar coordinates.
 */
const cartesianToPolar = (
  centerX: number,
  centerY: number,
  x: number,
  y: number,
): { radius: number; angleInDegrees: number } => {
  const radius = Math.hypot(x - centerX, y - centerY);
  let angleInDegrees = radiansToDegrees(Math.atan2(y - centerY, x - centerX));
  if (angleInDegrees < 0) {
    angleInDegrees += 360;
  }
  return { radius, angleInDegrees };
};

/**
 * Calculates length of circle.
 *
 * @returns The length of the circle.
 */
const getCircleLength = (radius: number): number => 2 * Math.PI * radius;

/**
 * Calculates height for the compact layout.
 *
 * @returns Card height.
 */
const calculateCompactLayoutHeight = (totalLangs: number): number =>
  COMPACT_LAYOUT_BASE_HEIGHT + Math.round(totalLangs / 2) * 25;

/**
 * Calculates height for the normal layout.
 *
 * @returns Card height.
 */
const calculateNormalLayoutHeight = (totalLangs: number): number => 45 + (totalLangs + 1) * 40;

/**
 * Calculates height for the donut layout.
 *
 * @returns Card height.
 */
const calculateDonutLayoutHeight = (totalLangs: number): number =>
  215 + Math.max(totalLangs - 5, 0) * 32;

/**
 * Calculates height for the donut vertical layout.
 *
 * @returns Card height.
 */
const calculateDonutVerticalLayoutHeight = (totalLangs: number): number =>
  300 + Math.round(totalLangs / 2) * 25;

/**
 * Calculates height for the pie layout.
 *
 * @returns Card height.
 */
const calculatePieLayoutHeight = (totalLangs: number): number =>
  300 + Math.round(totalLangs / 2) * 25;

/**
 * Calculates the center translation needed to keep the donut chart centred.
 *
 * @returns Donut center translation.
 */
const donutCenterTranslation = (totalLangs: number): number =>
  -45 + Math.max(totalLangs - 5, 0) * 16;

/**
 * Trim top languages to lang_count while also hiding certain languages.
 *
 * @returns Trimmed top languages and total size.
 */
const trimTopLanguages = (
  topLangs: TopLangData,
  langs_count: number,
  hide?: Array<string>,
): { langs: Array<Lang>; totalLanguageSize: number } => {
  let langs = Object.values(topLangs);
  const langsToHide: Record<string, boolean> = {};
  const langsCount = clampValue(langs_count, 1, MAXIMUM_LANGS_COUNT);

  // populate langsToHide map for quick lookup while filtering out
  if (hide) {
    for (const langName of hide) {
      langsToHide[lowercaseTrim(langName)] = true;
    }
  }

  // filter out languages to be hidden
  langs = langs
    .toSorted((a, b) => b.size - a.size)
    .filter((lang) => !langsToHide[lowercaseTrim(lang.name)])
    .slice(0, langsCount);

  const totalLanguageSize = langs.reduce((acc, curr) => acc + curr.size, 0);

  return { langs, totalLanguageSize };
};

/**
 * Get display value corresponding to the format.
 *
 * @returns Display value.
 */
const getDisplayValue = (size: number, percentages: number, format: string): string =>
  format === 'bytes' ? formatBytes(size) : `${percentages.toFixed(2)}%`;

/**
 * Resolves a language's display color, falling back to the default, and
 * validates it is a prefixed hex color.
 *
 * @returns Validated language color.
 */
const resolveLangColor = (lang: Lang): string => {
  const color = lang.color || DEFAULT_LANG_COLOR;
  if (!isPrefixedHexColor(color)) {
    throw new Error(`Invalid language color: "${color}"`);
  }
  return color;
};

/**
 * Create progress bar text item for a programming language.
 *
 * @returns Programming language SVG node.
 */
const createProgressTextNode = ({
  width,
  color,
  name,
  size,
  totalSize,
  statsFormat,
  hideValues,
  index,
}: {
  width: number;
  color: string;
  name: string;
  size: number;
  totalSize: number;
  statsFormat: string;
  hideValues?: boolean | undefined;
  index: number;
}): MarkupElement => {
  const staggerDelay = (index + 3) * 150;
  const paddingRight = hideValues ? CARD_PADDING * 2 : 95;
  const progressTextX = width - paddingRight + 10;
  const progressWidth = width - paddingRight;

  const progress = (size / totalSize) * 100;
  const displayValue = getDisplayValue(size, progress, statsFormat);

  return el(
    'g',
    { class: 'stagger', style: `animation-delay: ${staggerDelay}ms` },
    el('text', { 'data-testid': 'lang-name', x: 2, y: 15, class: 'lang-name' }, name),
    !hideValues && el('text', { x: progressTextX, y: 34, class: 'lang-name' }, displayValue),
    createProgressNode({
      x: 0,
      y: 25,
      color,
      width: progressWidth,
      progress,
      delay: staggerDelay + 300,
    }),
  );
};

/**
 * Creates compact text item for a programming language.
 *
 * @returns Compact layout programming language SVG node.
 */
const createCompactLangNode = ({
  lang,
  totalSize,
  hideProgress,
  hideValues,
  statsFormat = 'percentages',
  index,
}: {
  lang: Lang;
  totalSize: number;
  hideProgress?: boolean | undefined;
  hideValues?: boolean | undefined;
  statsFormat?: string | undefined;
  index: number;
}): MarkupElement => {
  const percentages = (lang.size / totalSize) * 100;
  const displayValue = getDisplayValue(lang.size, percentages, statsFormat);

  const staggerDelay = (index + 3) * 150;
  const color = resolveLangColor(lang);

  const label = hideProgress || hideValues ? lang.name : `${lang.name} ${displayValue}`;

  return el(
    'g',
    { class: 'stagger', style: `animation-delay: ${staggerDelay}ms` },
    el('circle', { cx: 5, cy: 6, r: 5, fill: color }),
    el('text', { 'data-testid': 'lang-name', x: 15, y: 10, class: 'lang-name' }, label),
  );
};

/**
 * Create compact languages text items for all programming languages.
 *
 * @returns Programming languages SVG node.
 */
const createLanguageTextNode = ({
  langs,
  totalSize,
  hideProgress,
  hideValues,
  statsFormat,
}: {
  langs: Array<Lang>;
  totalSize: number;
  hideProgress?: boolean | undefined;
  hideValues?: boolean | undefined;
  statsFormat?: string | undefined;
}): Array<Child> => {
  const longestLang = getLongestLang(langs);
  const chunked = chunkArray(langs, langs.length / 2);
  const layouts = chunked.map((array) => {
    const items = array.map((lang, index) =>
      createCompactLangNode({
        lang,
        totalSize,
        hideProgress,
        hideValues,
        statsFormat,
        index,
      }),
    );
    return flexLayout({ items, gap: 25, direction: 'column' });
  });

  const percent = ((longestLang.size / totalSize) * 100).toFixed(2);
  const minGap = 150;
  const maxGap = 20 + measureText(`${longestLang.name} ${percent}%`, 11);
  return flexLayout({ items: layouts, gap: maxGap < minGap ? minGap : maxGap });
};

/**
 * Create donut languages text items for all programming languages.
 *
 * @returns Donut layout programming language SVG node.
 */
const createDonutLanguagesNode = ({
  langs,
  totalSize,
  hideValues,
  statsFormat,
}: {
  langs: Array<Lang>;
  totalSize: number;
  hideValues?: boolean | undefined;
  statsFormat?: string | undefined;
}): Array<Child> =>
  flexLayout({
    items: langs.map((lang, index) =>
      createCompactLangNode({
        lang,
        totalSize,
        hideProgress: false,
        hideValues,
        statsFormat,
        index,
      }),
    ),
    gap: 32,
    direction: 'column',
  });

/**
 * Renders the default language card layout.
 *
 * @returns Normal layout card SVG object.
 */
const renderNormalLayout = (
  langs: Array<Lang>,
  width: number,
  totalLanguageSize: number,
  statsFormat: string,
  hideValues?: boolean,
): Array<Child> =>
  flexLayout({
    items: langs.map((lang, index) =>
      createProgressTextNode({
        width,
        name: lang.name,
        color: lang.color || DEFAULT_LANG_COLOR,
        size: lang.size,
        totalSize: totalLanguageSize,
        statsFormat,
        hideValues,
        index,
      }),
    ),
    gap: 40,
    direction: 'column',
  });

/**
 * Renders the compact language card layout.
 *
 * @returns Compact layout card SVG object.
 */
const renderCompactLayout = (
  langs: Array<Lang>,
  width: number,
  totalLanguageSize: number,
  hideProgress?: boolean,
  statsFormat = 'percentages',
  hideValues?: boolean,
): Array<Child> => {
  const paddingRight = 50;
  const offsetWidth = width - paddingRight;
  // progressOffset holds the previous language's width and used to offset the next language
  // so that we can stack them one after another, like this: [--][----][---]
  let progressOffset = 0;
  const compactProgressBar = langs.map((lang) => {
    const percentage = Number.parseFloat(
      ((lang.size / totalLanguageSize) * offsetWidth).toFixed(2),
    );
    const x = progressOffset;
    progressOffset += percentage;

    return el('rect', {
      mask: 'url(#rect-mask)',
      'data-testid': 'lang-progress',
      x,
      y: 0,
      width: percentage < 10 ? percentage + 10 : percentage,
      height: 8,
      fill: resolveLangColor(lang),
    });
  });

  return [
    !hideProgress && [
      el(
        'mask',
        { id: 'rect-mask' },
        el('rect', { x: 0, y: 0, width: offsetWidth, height: 8, fill: 'white', rx: 5 }),
      ),
      compactProgressBar,
    ],
    el(
      'g',
      { transform: `translate(0, ${hideProgress ? 0 : 25})` },
      createLanguageTextNode({
        langs,
        totalSize: totalLanguageSize,
        hideProgress,
        statsFormat,
        hideValues,
      }),
    ),
  ];
};

/**
 * Renders donut vertical layout to display user's most frequently used programming languages.
 *
 * @returns Compact layout card SVG object.
 */
const renderDonutVerticalLayout = (
  langs: Array<Lang>,
  totalLanguageSize: number,
  statsFormat: string,
  hideValues?: boolean,
): MarkupElement => {
  // Donut vertical chart radius and total length
  const radius = 80;
  const totalCircleLength = getCircleLength(radius);

  // SVG circles
  const circles = [];

  // Start indent for donut vertical chart parts
  let indent = 0;

  // Start delay coefficient for donut vertical chart parts
  let startDelayCoefficient = 1;

  // Generate each donut vertical chart part
  for (const lang of langs) {
    const langColor = resolveLangColor(lang);

    const percentage = (lang.size / totalLanguageSize) * 100;
    const circleLength = totalCircleLength * (percentage / 100);
    const delay = startDelayCoefficient * 100;

    circles.push(
      el(
        'g',
        { class: 'stagger', style: `animation-delay: ${delay}ms` },
        el('circle', {
          cx: 150,
          cy: 100,
          r: radius,
          fill: 'transparent',
          stroke: langColor,
          'stroke-width': 25,
          'stroke-dasharray': totalCircleLength,
          'stroke-dashoffset': indent,
          size: percentage,
          'data-testid': 'lang-donut',
        }),
      ),
    );

    // Update the indent for the next part
    indent += circleLength;
    // Update the start delay coefficient for the next part
    startDelayCoefficient += 1;
  }

  return el(
    'svg',
    { 'data-testid': 'lang-items' },
    el('svg', { 'data-testid': 'donut' }, circles),
    el(
      'g',
      { transform: 'translate(0, 220)' },
      el(
        'svg',
        { 'data-testid': 'lang-names', x: CARD_PADDING },
        createLanguageTextNode({
          langs,
          totalSize: totalLanguageSize,
          hideProgress: false,
          statsFormat,
          hideValues,
        }),
      ),
    ),
  );
};

/**
 * Renders pie layout to display user's most frequently used programming languages.
 *
 * @returns Compact layout card SVG object.
 */
const renderPieLayout = (
  langs: Array<Lang>,
  totalLanguageSize: number,
  statsFormat: string,
  hideValues?: boolean,
): MarkupElement => {
  // Pie chart radius and center coordinates
  const radius = 90;
  const centerX = 150;
  const centerY = 100;

  // Start angle for the pie chart parts
  let startAngle = 0;

  // Start delay coefficient for the pie chart parts
  let startDelayCoefficient = 1;

  // SVG paths
  const paths = [];

  // Generate each pie chart part
  for (const lang of langs) {
    const langColor = resolveLangColor(lang);

    if (langs.length === 1) {
      paths.push(
        el('circle', {
          cx: centerX,
          cy: centerY,
          r: radius,
          stroke: 'none',
          fill: langColor,
          'data-testid': 'lang-pie',
          size: 100,
        }),
      );
      break;
    }

    const langSizePart = lang.size / totalLanguageSize;
    const percentage = langSizePart * 100;
    // Calculate the angle for the current part
    const angle = langSizePart * 360;

    // Calculate the end angle
    const endAngle = startAngle + angle;

    // Calculate the coordinates of the start and end points of the arc
    const startPoint = polarToCartesian(centerX, centerY, radius, startAngle);
    const endPoint = polarToCartesian(centerX, centerY, radius, endAngle);

    // Determine the large arc flag based on the angle
    const largeArcFlag = angle > 180 ? 1 : 0;

    // Calculate delay
    const delay = startDelayCoefficient * 100;

    // SVG arc markup
    paths.push(
      el(
        'g',
        { class: 'stagger', style: `animation-delay: ${delay}ms` },
        el('path', {
          'data-testid': 'lang-pie',
          size: percentage,
          d: `M ${centerX} ${centerY} L ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y} Z`,
          fill: langColor,
        }),
      ),
    );

    // Update the start angle for the next part
    startAngle = endAngle;
    // Update the start delay coefficient for the next part
    startDelayCoefficient += 1;
  }

  return el(
    'svg',
    { 'data-testid': 'lang-items' },
    el('svg', { 'data-testid': 'pie' }, paths),
    el(
      'g',
      { transform: 'translate(0, 220)' },
      el(
        'svg',
        { 'data-testid': 'lang-names', x: CARD_PADDING },
        createLanguageTextNode({
          langs,
          totalSize: totalLanguageSize,
          hideProgress: false,
          statsFormat,
          hideValues,
        }),
      ),
    ),
  );
};

/**
 * Creates the SVG paths for the language donut chart.
 *
 * @returns Array of svg path elements
 */
const createDonutPaths = (
  cx: number,
  cy: number,
  radius: number,
  percentages: Array<number>,
): Array<{ d: string; percent: number }> => {
  const paths: Array<{ d: string; percent: number }> = [];
  let startAngle = 0;

  const totalPercent = percentages.reduce((acc, curr) => acc + curr, 0);
  for (const rawPercent of percentages) {
    const percent = Number.parseFloat(((rawPercent / totalPercent) * 100).toFixed(2));

    const endAngle = 3.6 * percent + startAngle;
    const startPoint = polarToCartesian(cx, cy, radius, endAngle - 90); // rotate donut 90 degrees counter-clockwise.
    const endPoint = polarToCartesian(cx, cy, radius, startAngle - 90); // rotate donut 90 degrees counter-clockwise.
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

    paths.push({
      percent,
      d: `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 0 ${endPoint.x} ${endPoint.y}`,
    });
    startAngle = endAngle;
  }

  return paths;
};

/**
 * Renders the donut language card layout.
 *
 * @returns Donut layout card SVG object.
 */
const renderDonutLayout = (
  langs: Array<Lang>,
  width: number,
  totalLanguageSize: number,
  statsFormat: string,
  hideValues?: boolean,
): Array<Child> => {
  if (!Number.isFinite(width)) {
    throw new TypeError(`Invalid width: "${width}"`);
  }

  const centerX = width / 3;
  const centerY = width / 3;
  const radius = centerX - 60;
  const strokeWidth = 12;

  const colors = langs.map((lang) => resolveLangColor(lang));
  const langsPercents = langs.map((lang) =>
    Number.parseFloat(((lang.size / totalLanguageSize) * 100).toFixed(2)),
  );

  const langPaths = createDonutPaths(centerX, centerY, radius, langsPercents);

  const donutPaths: Array<Child> =
    langs.length === 1
      ? [
          el('circle', {
            cx: centerX,
            cy: centerY,
            r: radius,
            stroke: colors[0] ?? DEFAULT_LANG_COLOR,
            fill: 'none',
            'stroke-width': strokeWidth,
            'data-testid': 'lang-donut',
            size: 100,
          }),
        ]
      : langPaths.map((section, index) =>
          el(
            'g',
            { class: 'stagger', style: `animation-delay: ${(index + 3) * 100 + 300}ms` },
            el('path', {
              'data-testid': 'lang-donut',
              size: section.percent,
              d: section.d,
              stroke: colors[index] ?? DEFAULT_LANG_COLOR,
              fill: 'none',
              'stroke-width': strokeWidth,
            }),
          ),
        );

  return [
    createDonutLanguagesNode({ langs, totalSize: totalLanguageSize, hideValues, statsFormat }),
    el(
      'g',
      { transform: `translate(125, ${donutCenterTranslation(langs.length)})` },
      el('svg', { width, height: width }, donutPaths),
    ),
  ];
};

/**
 * Creates the no languages data SVG node.
 *
 * @returns No languages data SVG node string.
 */
const noLanguagesDataNode = ({
  text,
  layout,
}: {
  text: string;
  layout: TopLangLayout | undefined;
}): MarkupElement =>
  el(
    'text',
    {
      x: layout === 'pie' || layout === 'donut-vertical' ? CARD_PADDING : 0,
      y: 11,
      class: 'stat bold',
    },
    text,
  );

/**
 * Get default languages count for provided card layout.
 *
 * @returns Default languages count for input layout.
 */
const getDefaultLanguagesCountByLayout = ({
  layout,
  hide_progress,
}: {
  layout?: TopLangLayout | undefined;
  hide_progress?: boolean | undefined;
}): number => {
  if (layout === 'compact' || hide_progress === true) {
    return COMPACT_LAYOUT_DEFAULT_LANGS_COUNT;
  }
  if (layout === 'donut') {
    return DONUT_LAYOUT_DEFAULT_LANGS_COUNT;
  }
  if (layout === 'donut-vertical') {
    return DONUT_VERTICAL_LAYOUT_DEFAULT_LANGS_COUNT;
  }
  if (layout === 'pie') {
    return PIE_LAYOUT_DEFAULT_LANGS_COUNT;
  }
  return NORMAL_LAYOUT_DEFAULT_LANGS_COUNT;
};

/**
 * Renders card that display user's most frequently used programming languages.
 *
 * @returns Language card SVG object.
 */
const renderTopLanguages = (
  topLangs: TopLangData,
  options: CardOptions<TopLangOptions> = {},
): string => {
  const {
    hide_title = false,
    hide_border = false,
    card_width,
    hide,
    hide_progress,
    hide_values,
    layout,
    custom_title,
    locale,
    langs_count = getDefaultLanguagesCountByLayout({ layout, hide_progress }),
    border_radius,
    disable_animations,
    stats_format = 'percentages',
  } = options;

  const i18n = new I18n({
    locale,
    translations: langCardLocales,
  });

  const { langs, totalLanguageSize } = trimTopLanguages(topLangs, langs_count, hide);

  let width = card_width
    ? Number.isNaN(card_width)
      ? DEFAULT_CARD_WIDTH
      : card_width < MIN_CARD_WIDTH
        ? MIN_CARD_WIDTH
        : card_width
    : DEFAULT_CARD_WIDTH;
  let height = calculateNormalLayoutHeight(langs.length);

  const { lightColors, darkColors } = getLightDarkColors(options);

  let finalLayout: Child;
  if (langs.length === 0) {
    height = COMPACT_LAYOUT_BASE_HEIGHT;
    finalLayout = noLanguagesDataNode({
      text: i18n.t('langcard.nodata'),
      layout,
    });
  } else if (layout === 'pie') {
    height = calculatePieLayoutHeight(langs.length);
    finalLayout = renderPieLayout(langs, totalLanguageSize, stats_format, hide_values);
  } else if (layout === 'donut-vertical') {
    height = calculateDonutVerticalLayoutHeight(langs.length);
    finalLayout = renderDonutVerticalLayout(langs, totalLanguageSize, stats_format, hide_values);
  } else if (layout === 'compact' || hide_progress === true) {
    height = calculateCompactLayoutHeight(langs.length) + (hide_progress ? -25 : 0);

    finalLayout = renderCompactLayout(
      langs,
      width,
      totalLanguageSize,
      hide_progress,
      stats_format,
      hide_values,
    );
  } else if (layout === 'donut') {
    height = calculateDonutLayoutHeight(langs.length);
    width += 50; // padding
    finalLayout = renderDonutLayout(langs, width, totalLanguageSize, stats_format, hide_values);
  } else {
    finalLayout = renderNormalLayout(langs, width, totalLanguageSize, stats_format, hide_values);
  }

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: i18n.t('langcard.title'),
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
    light: ({ textColor, progBarBgColor }) => [
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
      rule('.stat', {
        font: `600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif`,
        fill: textColor,
      }),
      atRule(
        '@supports(-moz-appearance: auto)',
        cssComment('Selector detects Firefox'),
        rule('.stat', { 'font-size': '12px' }),
      ),
      rule('.bold', { 'font-weight': 700 }),
      rule('.lang-name', { font: '400 11px "Segoe UI", Ubuntu, Sans-Serif', fill: textColor }),
      rule('.stagger', { opacity: 0, animation: 'fadeInAnimation 0.3s ease-in-out forwards' }),
      rule('#rect-mask rect', { animation: 'slideInAnimation 1s ease-in-out forwards' }),
      rule('.lang-progress', { animation: 'growWidthAnimation 0.6s ease-in-out forwards' }),
      rule('.progress-background', { fill: progBarBgColor }),
    ],
    dark: ({ textColor, progBarBgColor }) => [
      rule('.stat', { fill: textColor }),
      rule('.lang-name', { fill: textColor }),
      rule('.progress-background', { fill: progBarBgColor }),
    ],
  });

  // `role="img"` hides the inner text from assistive tech, so everything the card
  // shows has to be repeated here.
  card.setAccessibilityLabel({
    title: card.title,
    desc: langs
      .map((lang) => `${lang.name} ${((lang.size / totalLanguageSize) * 100).toFixed(2)}%`)
      .join(', '),
  });

  if (layout === 'pie' || layout === 'donut-vertical') {
    return card.render(finalLayout);
  }

  return card.render(el('svg', { 'data-testid': 'lang-items', x: CARD_PADDING }, finalLayout));
};

export {
  getLongestLang,
  degreesToRadians,
  radiansToDegrees,
  polarToCartesian,
  cartesianToPolar,
  getCircleLength,
  calculateCompactLayoutHeight,
  calculateNormalLayoutHeight,
  calculateDonutLayoutHeight,
  calculateDonutVerticalLayoutHeight,
  calculatePieLayoutHeight,
  donutCenterTranslation,
  trimTopLanguages,
  renderTopLanguages,
  MIN_CARD_WIDTH,
  getDefaultLanguagesCountByLayout,
  TOP_LANG_LAYOUTS,
  TOP_LANG_STATS_FORMATS,
};
