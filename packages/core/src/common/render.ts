import type { Child, MarkupElement } from '../markup/index.ts';
import { el, renderMarkup, rule, style } from '../markup/index.ts';

import { CARD_STYLE } from './brand.ts';
import { getCardColors, isPrefixedHexColor } from './color.ts';
import { kFormatter } from './fmt.ts';
import { clampValue } from './ops.ts';
import { measureText } from './text.ts';

/**
 * Auto layout utility, allows us to layout things vertically or horizontally with
 * proper gaping.
 *
 * @returns The items, each in the group that positions it.
 */
const flexLayout = ({
  items,
  gap,
  direction,
  sizes = [],
}: {
  items: Array<Child>;
  gap: number;
  direction?: 'column' | 'row';
  sizes?: Array<number>;
}): Array<Child> => {
  if (sizes.some((size) => !Number.isFinite(size))) {
    throw new Error('flexLayout: `sizes` must contain only numbers');
  }

  const laidOut = items.filter(Boolean);

  // A lone item is already where it belongs, so it needs no group to move it.
  if (laidOut.length === 1) {
    return laidOut;
  }

  let lastSize = 0;
  return laidOut.map((item, i) => {
    const offset = lastSize;
    lastSize += (sizes[i] ?? 0) + gap;

    // The first item never moves, so it gets no transform to carry.
    let transform: string | undefined;
    if (offset !== 0 && direction === 'column') {
      transform = `translate(0, ${offset})`;
    } else if (offset !== 0) {
      transform = `translate(${offset}, 0)`;
    }

    return el('g', { transform }, item);
  });
};

/**
 * Creates a node to display the primary programming language of the repository/gist.
 *
 * @returns Language display SVG object.
 */
const createLanguageNode = (langName: string, langColor: string): MarkupElement => {
  if (!isPrefixedHexColor(langColor)) {
    throw new Error(`Invalid language color: "${langColor}"`);
  }

  return el(
    'g',
    { 'data-testid': 'primary-lang' },
    el('circle', { 'data-testid': 'lang-color', cx: 0, cy: -5, r: 6, fill: langColor }),
    el('text', { 'data-testid': 'lang-name', class: 'gray', x: 15 }, langName),
  );
};

/**
 * Create a node to indicate progress in percentage along a horizontal line.
 *
 * @returns Progress node.
 */
const createProgressNode = ({
  x,
  y,
  width,
  color,
  progress,
  delay,
}: {
  x: number;
  y: number;
  width: number;
  /** When omitted, the color must be set via a `.lang-progress` CSS rule. */
  color?: string;
  progress: number;
  delay: number;
}): MarkupElement => {
  if (color !== undefined && !isPrefixedHexColor(color)) {
    throw new Error(`Invalid progress color: "${color}"`);
  }
  if (!Number.isFinite(width)) {
    throw new TypeError(`Invalid width: "${width}"`);
  }
  if (!Number.isFinite(x)) {
    throw new TypeError(`Invalid x: "${x}"`);
  }
  if (!Number.isFinite(y)) {
    throw new TypeError(`Invalid y: "${y}"`);
  }
  if (!Number.isFinite(delay)) {
    throw new TypeError(`Invalid delay: "${delay}"`);
  }

  const progressPercentage = clampValue(progress, 2, 100);

  return el(
    'svg',
    { width, x, y },
    el('rect', {
      'data-testid': 'progress-background',
      class: 'progress-background',
      rx: 5,
      ry: 5,
      x: 0,
      y: 0,
      width,
      height: 8,
    }),
    el(
      'svg',
      { 'data-testid': 'lang-progress', width: `${progressPercentage}%` },
      el('rect', {
        height: 8,
        fill: color,
        rx: 5,
        ry: 5,
        x: 0,
        y: 0,
        class: 'lang-progress',
        style: `animation-delay: ${delay}ms;`,
      }),
    ),
  );
};

/**
 * Creates an icon with label to display repository/gist stats like forks, stars, etc.
 * Draws nothing when the label is not positive.
 *
 * @returns Icon with label SVG object, or nothing when the label is not positive.
 */
const iconWithLabel = (
  icon: Child,
  label: number | string,
  testid: string,
  iconSize: number,
): Child => {
  if (typeof label === 'number' && label <= 0) {
    return undefined;
  }

  if (!Number.isFinite(iconSize)) {
    throw new TypeError(`Invalid iconSize: "${iconSize}"`);
  }

  return flexLayout({
    items: [
      el(
        'svg',
        {
          class: 'icon',
          y: -12,
          viewBox: '0 0 16 16',
          version: '1.1',
          width: iconSize,
          height: iconSize,
        },
        icon,
      ),
      el('text', { 'data-testid': testid, class: 'gray' }, String(label)),
    ],
    gap: 20,
  });
};

/** How a count is written: `short` abbreviates it (`1.5k`), `long` writes it out. */
const NUMBER_FORMATS = ['short', 'long'] as const;

/**
 * A count as a card draws it.
 *
 * @returns The count, abbreviated unless `numberFormat` is `long`, to 0–2 decimals.
 */
const formatCount = (
  value: number,
  numberFormat: string,
  /** Decimals kept when abbreviating, clamped to 0–2; the abbreviation's own default when absent. */
  numberPrecision?: number,
): string => {
  if (numberFormat.toLowerCase() === 'long') {
    return String(value);
  }

  if (numberPrecision === undefined) {
    return String(kFormatter(value));
  }

  return String(kFormatter(value, clampValue(numberPrecision, 0, 2)));
};

/**
 * Create a labelled stat text item
 * (a label and its value, optionally with an icon and link).
 * Shared by the stats and repo cards.
 *
 * The caller must ensure that the passed `link` is properly sanitized!
 *
 * @returns The stats card text item SVG object.
 */
const createTextNode = ({
  icon,
  label,
  value,
  id,
  unitSymbol,
  index,
  showIcons,
  shiftValuePos,
  valueAnchorX,
  bold,
  labelBold = bold,
  numberFormat,
  numberPrecision,
  link,
  labelXOffset = 25,
}: {
  icon: Child;
  label: string;
  value: number | string;
  id: string;
  // `| undefined`: card callers forward possibly-undefined per-stat fields
  unitSymbol?: string | undefined;
  index: number;
  showIcons: boolean;
  shiftValuePos: number;
  valueAnchorX?: number | undefined;
  bold: boolean;
  labelBold?: boolean;
  numberFormat: string;
  numberPrecision?: number | undefined;
  link?: string | undefined;
  labelXOffset?: number;
}): MarkupElement => {
  if (!Number.isFinite(labelXOffset)) {
    throw new TypeError(`Invalid labelXOffset: "${labelXOffset}"`);
  }
  if (!Number.isFinite(shiftValuePos)) {
    throw new TypeError(`Invalid shiftValuePos: "${shiftValuePos}"`);
  }
  if (!Number.isFinite(index)) {
    throw new TypeError(`Invalid index: "${index}"`);
  }
  if (valueAnchorX !== undefined && !Number.isFinite(valueAnchorX)) {
    throw new Error(`Invalid valueAnchorX: "${valueAnchorX}"`);
  }

  const precision =
    numberPrecision !== undefined && Number.isFinite(numberPrecision)
      ? clampValue(numberPrecision, 0, 2)
      : undefined;
  // `long` format and the percentage stat keep the raw value; everything else
  // (always a number here) is abbreviated via kFormatter.
  const rawValue = numberFormat.toLowerCase() === 'long' || id === 'prs_merged_percentage';
  const kValue = rawValue || typeof value !== 'number' ? value : kFormatter(value, precision);

  const staggerDelay = 120 + index * 40;
  const boldClass = bold ? 'bold' : 'not_bold';
  const labelBoldClass = labelBold ? 'bold' : 'not_bold';
  const valueX = (showIcons ? 140 : 120) + (bold ? 5 : 0) + shiftValuePos;
  const unit = unitSymbol ? ` ${unitSymbol}` : '';

  const content = [
    showIcons &&
      el(
        'svg',
        {
          'data-testid': 'icon',
          class: 'icon',
          viewBox: '0 0 16 16',
          version: '1.1',
          width: 16,
          height: 16,
        },
        icon,
      ),
    el(
      'text',
      { class: `stat ${labelBoldClass}`, x: showIcons ? labelXOffset : undefined, y: 12.5 },
      `${label}:`,
    ),
    el(
      'text',
      {
        class: `stat ${boldClass}`,
        x: valueAnchorX ?? valueX,
        'text-anchor': valueAnchorX === undefined ? undefined : 'end',
        y: 12.5,
        'data-testid': id,
      },
      `${String(kValue)}${unit}`,
    ),
  ];

  return el(
    'g',
    {
      class: 'stagger',
      style: `animation-delay: ${staggerDelay}ms`,
      transform: 'translate(25, 0)',
    },
    link ? el('a', { href: link }, content) : content,
  );
};

const ERROR_CARD_LENGTH = 576.5;

/**
 * Renders error message on the card.
 *
 * @returns The SVG markup.
 */
const renderError = ({
  message,
  secondaryMessage = '',
  renderOptions = {},
}: {
  message: string;
  secondaryMessage?: string | undefined;
  // `| undefined`: api handlers forward absent query params
  renderOptions?: {
    title_color?: string | undefined;
    text_color?: string | undefined;
    bg_color?: string | undefined;
    border_color?: string | undefined;
    theme?: string | undefined;
    reportable?: boolean | undefined;
  };
}): string => {
  const {
    title_color,
    text_color,
    bg_color,
    border_color,
    theme = 'default',
    reportable = true,
  } = renderOptions;

  const { titleColor, textColor, bgColor, borderColor } = getCardColors({
    title_color,
    text_color,
    icon_color: '',
    bg_color,
    border_color,
    ring_color: '',
    theme,
  });

  /*
   * Its own line, at the small size, because it no longer fits beside the title: the inherited URL
   * ran to 561px inside a 576.5px card and this one runs past it. Measured in a canvas at the
   * title's own font, so re-measure before putting it back on one line.
   */
  const report = reportable ? 'File an issue at https://tinyurl.com/github-stats-forge-bug' : '';

  return renderMarkup(
    el(
      'svg',
      {
        width: ERROR_CARD_LENGTH,
        height: 120,
        viewBox: `0 0 ${ERROR_CARD_LENGTH} 120`,
        fill: String(bgColor),
        xmlns: 'http://www.w3.org/2000/svg',
        role: 'img',
        'aria-labelledby': 'title-id desc-id',
      },
      el('title', { id: 'title-id' }, message),
      el('desc', { id: 'desc-id' }, secondaryMessage),
      style(
        rule('.text', { font: "600 16px 'Segoe UI', Ubuntu, Sans-Serif", fill: titleColor }),
        rule('.small', { font: "600 12px 'Segoe UI', Ubuntu, Sans-Serif", fill: textColor }),
        rule('.gray', { fill: '#858585' }),
      ),
      el('rect', {
        x: 0.5,
        y: 0.5,
        width: ERROR_CARD_LENGTH - 1,
        height: '99%',
        rx: 8,
        fill: String(bgColor),
        stroke: borderColor,
      }),
      el('text', { x: 25, y: 45, class: 'text' }, 'Something went wrong!'),
      el(
        'text',
        { 'data-testid': 'message', x: 25, y: 55, class: 'text small' },
        el('tspan', { x: 25, dy: 18 }, message),
        el('tspan', { x: 25, dy: 18, class: 'gray' }, secondaryMessage),
      ),
      report !== '' &&
        el('text', { 'data-testid': 'report', x: 25, y: 109, class: 'text small gray' }, report),
    ),
  );
};

/** @returns How wide a compact list column draws: its widest label, past the row's dot. */
const compactColumnWidth = (labels: Array<string>): number =>
  Math.max(
    0,
    ...labels.map(
      (label) => CARD_STYLE.compactList.labelX + measureText(label, CARD_STYLE.fontSize.micro),
    ),
  );

export {
  compactColumnWidth,
  formatCount,
  NUMBER_FORMATS,
  renderError,
  createLanguageNode,
  createProgressNode,
  createTextNode,
  iconWithLabel,
  flexLayout,
};
