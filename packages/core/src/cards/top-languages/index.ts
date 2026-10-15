import { CARD_ICON, CARD_STYLE, firefoxFontSize, font } from '../../common/brand.ts';
import { Card } from '../../common/Card.ts';
import { getLightDarkColors, isPrefixedHexColor } from '../../common/color.ts';
import { formatBytes } from '../../common/fmt.ts';
import { DEFAULT_LANG_COLOR } from '../../common/languageColors.ts';
import { localize } from '../../common/localize.ts';
import { chunkArray, clampValue, lowercaseTrim } from '../../common/ops.ts';
import { createProgressNode, flexLayout, measureText } from '../../common/render.ts';
import type { Lang, TopLangData } from '../../fetchers/types.ts';
import type { Child, MarkupElement } from '../../markup/index.ts';
import { atRule, el, rule } from '../../markup/index.ts';
import type { CardOptions, CommonCardOptions } from '../options.ts';

import { langCardLocales } from './locales.ts';

const DEFAULT_CARD_WIDTH = CARD_STYLE.width.compact;
const MIN_CARD_WIDTH = 280;
/**
 * The compact layout's own floor: the body offset, one row of ink and `CARD_STYLE.padding.bottom`,
 * with the rows themselves added on top.
 */
const COMPACT_LAYOUT_BASE_HEIGHT = 86;
const NORMAL_LAYOUT_ROW_GAP = 40;
/** How far a normal-layout row's ink reaches below its own top: the value's baseline, plus descenders. */
const NORMAL_LAYOUT_ROW_INK = 37;
const MAXIMUM_LANGS_COUNT = 20;

const NORMAL_LAYOUT_DEFAULT_LANGS_COUNT = 5;
const COMPACT_LAYOUT_DEFAULT_LANGS_COUNT = 6;
const DONUT_LAYOUT_DEFAULT_LANGS_COUNT = 5;
/** Room for the chart that sits beside the language list. */
const DONUT_EXTRA_WIDTH = 50;
const DONUT_ROW_GAP = 32;
/** How far a donut-layout row's ink reaches below its own top: the label's baseline, plus descenders. */
const DONUT_ROW_INK = 13;
/** Fixed rather than taken from the width, which the card's height and the list cannot follow. */
const DONUT_RADIUS = 60;
const DONUT_STROKE_WIDTH = 12;
const DONUT_OUTER_RADIUS = DONUT_RADIUS + DONUT_STROKE_WIDTH / 2;
const PIE_LAYOUT_DEFAULT_LANGS_COUNT = 6;
const DONUT_VERTICAL_LAYOUT_DEFAULT_LANGS_COUNT = 6;

/** Layouts the card can draw; the api validates `layout` against this. */
const TOP_LANG_LAYOUTS = ['compact', 'normal', 'donut', 'donut-vertical', 'pie'] as const;
type TopLangLayout = (typeof TOP_LANG_LAYOUTS)[number];

/** How a language's value is shown; the api validates `value_format` against this. */
const TOP_LANG_VALUE_FORMATS = ['percent', 'bytes'] as const;
type TopLangValueFormat = (typeof TOP_LANG_VALUE_FORMATS)[number];

interface TopLangOptions extends CommonCardOptions {
  locale: string;
  hide_title: boolean;
  card_width: number;
  hide_langs: Array<string>;
  layout: TopLangLayout;
  title: string;
  langs_count: number;
  disable_animations: boolean;
  hide_progress: boolean;
  hide_values: boolean;
  prog_bar_bg_color: string;
  value_format: TopLangValueFormat;
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
const calculateNormalLayoutHeight = (totalLangs: number): number =>
  CARD_STYLE.padding.bodyOffsetY +
  Math.max(totalLangs - 1, 0) * NORMAL_LAYOUT_ROW_GAP +
  NORMAL_LAYOUT_ROW_INK +
  CARD_STYLE.padding.bottom;

/**
 * The height of the donut layout's language list.
 *
 * @returns From the top of the first row to the ink of the last.
 */
const donutLayoutListHeight = (totalLangs: number): number =>
  Math.max(totalLangs - 1, 0) * DONUT_ROW_GAP + DONUT_ROW_INK;

/**
 * The height of the donut layout's body: the list or the ring, whichever is taller.
 *
 * @returns Body height.
 */
const donutLayoutBodyHeight = (totalLangs: number): number =>
  Math.max(donutLayoutListHeight(totalLangs), DONUT_OUTER_RADIUS * 2);

/**
 * Calculates height for the donut layout.
 *
 * @returns Card height.
 */
const calculateDonutLayoutHeight = (totalLangs: number): number =>
  CARD_STYLE.padding.bodyOffsetY + donutLayoutBodyHeight(totalLangs) + CARD_STYLE.padding.bottom;

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
const getDisplayValue = (size: number, percentages: number, format: string): string => {
  if (format === 'bytes') {
    return formatBytes(size);
  }

  return `${percentages.toFixed(2)}%`;
};

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
  valueFormat,
  hideValues,
  index,
}: {
  width: number;
  color: string;
  name: string;
  size: number;
  totalSize: number;
  valueFormat: string;
  hideValues?: boolean | undefined;
  index: number;
}): MarkupElement => {
  const staggerDelay = (index + 3) * 150;
  const paddingRight = hideValues ? CARD_STYLE.padding.x * 2 : 95;
  const progressTextX = width - paddingRight + 10;
  const progressWidth = width - paddingRight;

  const progress = (size / totalSize) * 100;
  const displayValue = getDisplayValue(size, progress, valueFormat);

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
  valueFormat = 'percent',
  index,
}: {
  lang: Lang;
  totalSize: number;
  hideProgress?: boolean | undefined;
  hideValues?: boolean | undefined;
  valueFormat?: string | undefined;
  index: number;
}): MarkupElement => {
  const percentages = (lang.size / totalSize) * 100;
  const displayValue = getDisplayValue(lang.size, percentages, valueFormat);

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
  valueFormat,
}: {
  langs: Array<Lang>;
  totalSize: number;
  hideProgress?: boolean | undefined;
  hideValues?: boolean | undefined;
  valueFormat?: string | undefined;
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
        valueFormat,
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
  valueFormat,
}: {
  langs: Array<Lang>;
  totalSize: number;
  hideValues?: boolean | undefined;
  valueFormat?: string | undefined;
}): Array<Child> =>
  flexLayout({
    items: langs.map((lang, index) =>
      createCompactLangNode({
        lang,
        totalSize,
        hideProgress: false,
        hideValues,
        valueFormat,
        index,
      }),
    ),
    gap: DONUT_ROW_GAP,
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
  valueFormat: string,
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
        valueFormat,
        hideValues,
        index,
      }),
    ),
    gap: NORMAL_LAYOUT_ROW_GAP,
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
  valueFormat = 'percent',
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
        valueFormat,
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
  valueFormat: string,
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
        { 'data-testid': 'lang-names', x: CARD_STYLE.padding.x },
        createLanguageTextNode({
          langs,
          totalSize: totalLanguageSize,
          hideProgress: false,
          valueFormat,
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
  valueFormat: string,
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
        { 'data-testid': 'lang-names', x: CARD_STYLE.padding.x },
        createLanguageTextNode({
          langs,
          totalSize: totalLanguageSize,
          hideProgress: false,
          valueFormat,
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
  valueFormat: string,
  hideValues?: boolean,
): Array<Child> => {
  if (!Number.isFinite(width)) {
    throw new TypeError(`Invalid width: "${width}"`);
  }

  const bodyHeight = donutLayoutBodyHeight(langs.length);
  // The body is drawn from the card's left padding, and the ring stops at its right one.
  const centerX = width - CARD_STYLE.padding.x * 2 - DONUT_OUTER_RADIUS;
  const centerY = bodyHeight / 2;
  const listOffsetY = (bodyHeight - donutLayoutListHeight(langs.length)) / 2;

  const colors = langs.map((lang) => resolveLangColor(lang));
  const langsPercents = langs.map((lang) =>
    Number.parseFloat(((lang.size / totalLanguageSize) * 100).toFixed(2)),
  );

  const langPaths = createDonutPaths(centerX, centerY, DONUT_RADIUS, langsPercents);

  const donutPaths: Array<Child> =
    langs.length === 1
      ? [
          el('circle', {
            cx: centerX,
            cy: centerY,
            r: DONUT_RADIUS,
            stroke: colors[0] ?? DEFAULT_LANG_COLOR,
            fill: 'none',
            'stroke-width': DONUT_STROKE_WIDTH,
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
              'stroke-width': DONUT_STROKE_WIDTH,
            }),
          ),
        );

  return [
    el(
      'g',
      { 'data-testid': 'donut-list', transform: `translate(0, ${listOffsetY})` },
      createDonutLanguagesNode({ langs, totalSize: totalLanguageSize, hideValues, valueFormat }),
    ),
    el('g', { 'data-testid': 'donut' }, donutPaths),
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
      x: layout === 'pie' || layout === 'donut-vertical' ? CARD_STYLE.padding.x : 0,
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
const renderCard = (topLangs: TopLangData, options: CardOptions<TopLangOptions> = {}): string => {
  const {
    hide_title = false,
    hide_border = false,
    card_width,
    hide_langs,
    hide_progress,
    hide_values,
    layout,
    title,
    locale,
    langs_count = getDefaultLanguagesCountByLayout({ layout, hide_progress }),
    border_radius,
    disable_animations,
    value_format = 'percent',
  } = options;

  const t = localize(langCardLocales, locale);

  const { langs, totalLanguageSize } = trimTopLanguages(topLangs, langs_count, hide_langs);

  let width: number = DEFAULT_CARD_WIDTH;
  if (card_width && !Number.isNaN(card_width)) {
    width = Math.max(card_width, MIN_CARD_WIDTH);
  }
  let height = calculateNormalLayoutHeight(langs.length);

  const { lightColors, darkColors } = getLightDarkColors(options);

  let finalLayout: Child;
  if (langs.length === 0) {
    height = COMPACT_LAYOUT_BASE_HEIGHT;
    finalLayout = noLanguagesDataNode({
      text: t.noData(),
      layout,
    });
  } else if (layout === 'pie') {
    height = calculatePieLayoutHeight(langs.length);
    finalLayout = renderPieLayout(langs, totalLanguageSize, value_format, hide_values);
  } else if (layout === 'donut-vertical') {
    height = calculateDonutVerticalLayoutHeight(langs.length);
    finalLayout = renderDonutVerticalLayout(langs, totalLanguageSize, value_format, hide_values);
  } else if (layout === 'compact' || hide_progress === true) {
    height = calculateCompactLayoutHeight(langs.length) + (hide_progress ? -25 : 0);

    finalLayout = renderCompactLayout(
      langs,
      width,
      totalLanguageSize,
      hide_progress,
      value_format,
      hide_values,
    );
  } else if (layout === 'donut') {
    height = calculateDonutLayoutHeight(langs.length);
    // A donut defaults a step wider so the chart has its room; a width asked for
    // explicitly keeps the extra it has always been given instead of being snapped.
    width = width === DEFAULT_CARD_WIDTH ? CARD_STYLE.width.standard : width + DONUT_EXTRA_WIDTH;
    finalLayout = renderDonutLayout(langs, width, totalLanguageSize, value_format, hide_values);
  } else {
    finalLayout = renderNormalLayout(langs, width, totalLanguageSize, value_format, hide_values);
  }

  const card = new Card({
    customTitle: title,
    defaultTitle: t.title(),
    titlePrefixIcon: CARD_ICON.topLanguages,
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
        font: font('regular', 'body'),
        fill: textColor,
      }),
      firefoxFontSize(['.stat'], 'small'),
      rule('.bold', { 'font-weight': CARD_STYLE.fontWeight.semibold }),
      rule('.lang-name', { font: font('regular', 'micro'), fill: textColor }),
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

  return card.render(
    el('svg', { 'data-testid': 'lang-items', x: CARD_STYLE.padding.x }, finalLayout),
  );
};

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * They ride on the renderer so a list cannot be found without what draws it;
 * the api handler forwards them onto its own export, which is what a UI reads.
 */
const renderTopLanguages = Object.assign(renderCard, {
  OPTIONS: {
    layout: TOP_LANG_LAYOUTS,
    value_format: TOP_LANG_VALUE_FORMATS,
  },
});

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
  trimTopLanguages,
  MIN_CARD_WIDTH,
  getDefaultLanguagesCountByLayout,
  renderTopLanguages,
};
