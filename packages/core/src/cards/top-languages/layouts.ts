import { CARD_STYLE } from '../../common/brand.ts';
import { isPrefixedHexColor } from '../../common/color.ts';
import { formatBytes } from '../../common/fmt.ts';
import { DEFAULT_LANG_COLOR } from '../../common/languageColors.ts';
import { chunkArray } from '../../common/ops.ts';
import { compactColumnWidth, createProgressNode, flexLayout } from '../../common/render.ts';
import type { Lang } from '../../fetchers/types.ts';
import type { Child, MarkupElement } from '../../markup/index.ts';
import { el } from '../../markup/index.ts';

import { getCircleLength, polarToCartesian } from './geometry.ts';

/**
 * The compact layout's own floor: the body offset, one row of ink and `CARD_STYLE.padding.bottom`,
 * with the rows themselves added on top.
 */
const COMPACT_LAYOUT_BASE_HEIGHT = 86;
const NORMAL_LAYOUT_ROW_GAP = 40;
/** How far a normal-layout row's ink reaches below its own top: the value's baseline, plus descenders. */
const NORMAL_LAYOUT_ROW_INK = 37;
const DONUT_ROW_GAP = 32;
/** How far a donut-layout row's ink reaches below its own top: the label's baseline, plus descenders. */
const DONUT_ROW_INK = 13;
/** Fixed rather than taken from the width, which the card's height and the list cannot follow. */
const DONUT_RADIUS = 60;
const DONUT_STROKE_WIDTH = 12;
const DONUT_OUTER_RADIUS = DONUT_RADIUS + DONUT_STROKE_WIDTH / 2;
/** Layouts the card can draw; the api validates `layout` against this. */
const TOP_LANG_LAYOUTS = ['compact', 'normal', 'donut', 'donut-vertical', 'pie'] as const;
type TopLangLayout = (typeof TOP_LANG_LAYOUTS)[number];

/** How a language's value is shown; the api validates `value_format` against this. */
const TOP_LANG_VALUE_FORMATS = ['percent', 'bytes'] as const;
type TopLangValueFormat = (typeof TOP_LANG_VALUE_FORMATS)[number];

const COMPACT_MIN_COLUMN_GAP = 150;

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
 * Get display value corresponding to the format.
 *
 * @returns Display value.
 */
const getDisplayValue = (size: number, percentages: number, format: TopLangValueFormat): string => {
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
  valueFormat: TopLangValueFormat;
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

interface CompactListOptions {
  totalSize: number;
  hideProgress?: boolean | undefined;
  hideValues?: boolean | undefined;
  valueFormat?: TopLangValueFormat | undefined;
}

/**
 * The text a compact row draws for a language.
 *
 * @returns The language's name, followed by its value unless values are hidden.
 */
const compactLabel = (
  lang: Lang,
  { totalSize, hideProgress, hideValues, valueFormat = 'percent' }: CompactListOptions,
): string => {
  if (hideProgress || hideValues) {
    return lang.name;
  }
  const percentages = (lang.size / totalSize) * 100;
  return `${lang.name} ${getDisplayValue(lang.size, percentages, valueFormat)}`;
};

/**
 * Splits the compact list into its two columns and measures them.
 *
 * @returns The columns, the second column's offset, and the width the whole list takes.
 */
const measureCompactList = (
  langs: Array<Lang>,
  options: CompactListOptions,
): { columns: Array<Array<Lang>>; gap: number; width: number } => {
  const columns = chunkArray(langs, langs.length / 2);
  const columnWidths = columns.map((column) =>
    compactColumnWidth(column.map((lang) => compactLabel(lang, options))),
  );
  const gap = Math.max(
    COMPACT_MIN_COLUMN_GAP,
    (columnWidths[0] ?? 0) + CARD_STYLE.compactList.columnAir,
  );
  const width = gap * (columns.length - 1) + (columnWidths.at(-1) ?? 0);
  return { columns, gap, width };
};

/**
 * Creates compact text item for a programming language.
 *
 * @returns Compact layout programming language SVG node.
 */
const createCompactLangNode = ({
  lang,
  index,
  ...options
}: CompactListOptions & { lang: Lang; index: number }): MarkupElement => {
  const staggerDelay = (index + 3) * 150;
  const color = resolveLangColor(lang);

  return el(
    'g',
    { class: 'stagger', style: `animation-delay: ${staggerDelay}ms` },
    el('circle', { cx: 5, cy: 6, r: 5, fill: color }),
    el(
      'text',
      { 'data-testid': 'lang-name', x: CARD_STYLE.compactList.labelX, y: 10, class: 'lang-name' },
      compactLabel(lang, options),
    ),
  );
};

/**
 * Create compact languages text items for all programming languages.
 *
 * @returns Programming languages SVG node.
 */
const createLanguageTextNode = ({
  langs,
  ...options
}: CompactListOptions & { langs: Array<Lang> }): Array<Child> => {
  const { columns, gap } = measureCompactList(langs, options);
  const layouts = columns.map((column) => {
    const items = column.map((lang, index) => createCompactLangNode({ lang, index, ...options }));
    return flexLayout({ items, gap: 25, direction: 'column' });
  });

  return flexLayout({ items: layouts, gap });
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
  valueFormat?: TopLangValueFormat | undefined;
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
  valueFormat: TopLangValueFormat,
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
  valueFormat: TopLangValueFormat = 'percent',
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
  width: number,
  totalLanguageSize: number,
  valueFormat: TopLangValueFormat,
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
          cx: width / 2,
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
  width: number,
  totalLanguageSize: number,
  valueFormat: TopLangValueFormat,
  hideValues?: boolean,
): MarkupElement => {
  // Pie chart radius and center coordinates
  const radius = 90;
  const centerX = width / 2;
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
  valueFormat: TopLangValueFormat,
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

export type { TopLangLayout, TopLangValueFormat };

export {
  COMPACT_LAYOUT_BASE_HEIGHT,
  TOP_LANG_LAYOUTS,
  TOP_LANG_VALUE_FORMATS,
  calculateCompactLayoutHeight,
  calculateDonutLayoutHeight,
  calculateDonutVerticalLayoutHeight,
  calculateNormalLayoutHeight,
  calculatePieLayoutHeight,
  measureCompactList,
  noLanguagesDataNode,
  renderCompactLayout,
  renderDonutLayout,
  renderDonutVerticalLayout,
  renderNormalLayout,
  renderPieLayout,
};
