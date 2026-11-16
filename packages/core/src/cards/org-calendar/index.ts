import {
  CARD_STYLE,
  Card,
  NUMBER_FORMATS,
  countFormatter,
  el,
  font,
  formatDecimal,
  getLightDarkColors,
  inkOn,
  localize,
  measureText,
  rule,
  titleFits,
} from '@stats-forge/card-kit';
import type {
  CardColors,
  Child,
  CssChild,
  Locale,
  Localized,
  NumberFormat,
} from '@stats-forge/card-kit';

import { CARD_ICON } from '../../common/brand.ts';
import { toSearchDate } from '../../common/date.ts';
import type { OrgCalendarData } from '../../fetchers/org-calendar/types.ts';
import type { CardOptions, CommonCardOptions } from '../options.ts';

import { orgCalendarCardLocales } from './locales.ts';

const CARD_DEFAULT_WIDTH = CARD_STYLE.width.wide;

/** Heat levels a busy week climbs through; level 0 is a week with nothing in it. */
const LEVELS = 4;

/** Each level's heat stop and opacity: the opacity keeps the levels apart on a one-color heat. */
const LEVEL_PAINT: ReadonlyArray<{ stop: 0 | 1 | 2; opacity: number }> = [
  { stop: 0, opacity: 0.4 },
  { stop: 1, opacity: 0.6 },
  { stop: 1, opacity: 0.8 },
  { stop: 2, opacity: 1 },
];

interface OrgCalendarCardOptions extends CommonCardOptions {
  locale: Locale;
  hide_title: boolean;
  card_width: number;
  title: string;
  disable_animations: boolean;
  number_format: NumberFormat;
  number_precision: number;
}

/**
 * The title, naming the organization unless that makes it too wide for the card.
 *
 * @returns The default title, which `title` still overrides.
 */
const defaultTitleFor = (
  t: Localized<typeof orgCalendarCardLocales>,
  name: string,
  cardWidth: number,
): string => {
  const apostrophe = /s$/i.test(name.trim()) ? '' : 's';
  const named = t.title({ name, apostrophe });
  if (titleFits(named, cardWidth)) {
    return named;
  }
  return t.titleUnnamed();
};

/**
 * A week's level: how far its count climbs toward the busiest week's.
 *
 * @returns 0 for an empty week, else 1 to {@link LEVELS}.
 */
const levelOf = (count: number, busiest: number): number => {
  if (count <= 0 || busiest <= 0) {
    return 0;
  }
  return Math.min(LEVELS, Math.ceil((count / busiest) * LEVELS));
};

/** @returns A level's fill in one color scheme: the track for an empty week, else the heat. */
const levelFill = (level: number, colors: CardColors): { fill: string; opacity: number } => {
  const paint = LEVEL_PAINT[level - 1];
  if (!paint) {
    return { fill: colors.progBarBgColor, opacity: 1 };
  }
  return { fill: colors.heat[paint.stop], opacity: paint.opacity };
};

/** @returns How wide a week's count draws. */
const countWidth = (text: string): number =>
  measureText(text, CARD_STYLE.fontSize.micro) * CARD_STYLE.semiboldInk;

/**
 * A week's count as the card formats its numbers, but whole below a thousand, which
 * `number_precision` would write as `0k`.
 *
 * @returns The count as text.
 */
const weekCount = (count: number, formatCount: (value: number) => string): string => {
  if (count < 1000) {
    return String(count);
  }
  return formatCount(count);
};

/**
 * The count in as few characters as it takes, rounded down so it never overstates.
 *
 * @returns `999`, `1.5k`, `12k`, `999k`, `1.2M`.
 */
const compactCount = (count: number, locale: Locale | undefined): string => {
  if (count < 1000) {
    return String(count);
  }
  let unit = 'k';
  let size = 1000;
  if (count >= 1_000_000) {
    unit = 'M';
    size = 1_000_000;
  }
  // tenths in whole numbers, so no float lands a hair under the digit it should show
  const tenths = Math.floor((count * 10) / size);
  if (tenths < 100) {
    return `${formatDecimal(tenths / 10, locale, 0, 1)}${unit}`;
  }
  return `${String(Math.floor(tenths / 10))}${unit}`;
};

/**
 * A week's count as its cell has room for: as the card formats it, else abbreviated, else as the
 * largest power of ten below it that fits, as `atLeast` words it.
 *
 * @returns The label, or `''` when not even `10+` fits.
 */
const countLabel = (
  count: number,
  room: number,
  formatCount: (value: number) => string,
  formatCompact: (value: number) => string,
  atLeast: (count: string) => string,
): string => {
  const labels = [weekCount(count, formatCount), formatCompact(count)];
  // the digits, not `Math.log10`, which can land a hair under a power of ten
  for (let exponent = String(Math.trunc(count)).length - 1; exponent > 0; exponent -= 1) {
    labels.push(atLeast(formatCompact(10 ** exponent)));
  }
  return labels.find((label) => countWidth(label) <= room) ?? '';
};

/**
 * Renders an organization's weeks, each a cell as hot as the week was busy.
 *
 * @returns The organization calendar card SVG object.
 */
const renderCard = (
  data: OrgCalendarData,
  options: CardOptions<OrgCalendarCardOptions> = {},
): string => {
  const { name, count, weeks } = data;
  const {
    hide_title = false,
    hide_border = false,
    card_width,
    title,
    border_radius,
    locale,
    disable_animations = false,
  } = options;

  const { lightColors, darkColors } = getLightDarkColors(options);
  const t = localize(orgCalendarCardLocales, locale);
  const formatCount = countFormatter(options);
  const formatCompact = (value: number): string => compactCount(value, locale);

  const { calendar } = CARD_STYLE;

  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  const busiest = Math.max(0, ...weeks.map((week) => week.count));
  const average = weeks.length === 0 ? 0 : Math.round(total / weeks.length);
  const counted = {
    prs_merged: t.prsMerged,
    prs_opened: t.prsOpened,
    issues_opened: t.issuesOpened,
    issues_closed: t.issuesClosed,
  }[count]({ count: total });
  const totalText = formatCount(total);
  const averageText = formatCount(average);
  const summary = t.summary({ counted, average: averageText });

  const totalWidth = measureText(totalText, CARD_STYLE.fontSize.display) * CARD_STYLE.semiboldInk;
  const [first] = weeks;
  const last = weeks.at(-1);
  const fromText = first ? toSearchDate(first.from) : '';
  const toText = last ? toSearchDate(last.to) : '';
  const swatches = Array.from({ length: LEVELS + 1 }, (_, level) => level);
  const lessWidth = measureText(t.less(), CARD_STYLE.fontSize.micro);
  const swatchRun = swatches.length * (calendar.swatch + calendar.cellGap) - calendar.cellGap;
  const legendWidth =
    lessWidth +
    calendar.legendGap +
    swatchRun +
    calendar.legendGap +
    measureText(t.more(), CARD_STYLE.fontSize.micro);

  // the headline and the foot are drawn whole, so the card is never narrower than either
  const headlineWidth =
    totalWidth + CARD_STYLE.headline.gap + measureText(summary, CARD_STYLE.fontSize.small);
  const footWidth =
    measureText(fromText, CARD_STYLE.fontSize.micro) +
    measureText(toText, CARD_STYLE.fontSize.micro) +
    legendWidth +
    2 * CARD_STYLE.headline.gap;
  const minWidth = Math.ceil(2 * CARD_STYLE.padding.x + Math.max(headlineWidth, footWidth));
  const width = Math.max(
    minWidth,
    card_width && !Number.isNaN(card_width) ? card_width : CARD_DEFAULT_WIDTH,
  );
  const inner = width - 2 * CARD_STYLE.padding.x;

  const headline = el(
    'g',
    { 'data-testid': 'headline' },
    el(
      'text',
      {
        'data-testid': 'total',
        class: 'calendar-total',
        x: CARD_STYLE.padding.x,
        y: CARD_STYLE.headline.baseline,
      },
      totalText,
    ),
    el(
      'text',
      {
        'data-testid': 'summary',
        class: 'calendar-summary',
        x: Math.round(CARD_STYLE.padding.x + totalWidth + CARD_STYLE.headline.gap),
        y: CARD_STYLE.headline.baseline,
      },
      summary,
    ),
  );

  const cellWidth = (inner - calendar.cellGap * (weeks.length - 1)) / weeks.length;
  const countRoom = cellWidth - 2 * calendar.countInset;
  const cells = weeks.map((week, index) => {
    const level = levelOf(week.count, busiest);
    const { fill, opacity } = levelFill(level, lightColors);
    const x = CARD_STYLE.padding.x + index * (cellWidth + calendar.cellGap);
    const delay = `animation-delay: ${String(index * 10)}ms`;
    const label = countLabel(week.count, countRoom, formatCount, formatCompact, (shown) =>
      t.atLeast({ shown }),
    );
    return [
      el('rect', {
        'data-testid': 'week',
        class: `week week-${String(level)}`,
        x: Math.round(x * 100) / 100,
        y: CARD_STYLE.headline.height,
        width: Math.round(cellWidth * 100) / 100,
        height: calendar.cellHeight,
        rx: 2,
        fill,
        'fill-opacity': opacity,
        style: delay,
      }),
      label &&
        el(
          'text',
          {
            'data-testid': 'week-count',
            class: `week week-count week-count-${String(level)}`,
            x: Math.round((x + cellWidth / 2) * 100) / 100,
            y: CARD_STYLE.headline.height + calendar.countBaseline,
            'text-anchor': 'middle',
            fill: inkOn(lightColors, fill, opacity),
            style: delay,
          },
          label,
        ),
    ];
  });

  const footY = CARD_STYLE.headline.height + calendar.cellHeight + calendar.footBaseline;
  const swatchY = footY - calendar.swatch + 1;
  const legendX = Math.round(CARD_STYLE.padding.x + (inner - legendWidth) / 2);
  const swatchX = legendX + lessWidth + calendar.legendGap;

  const foot: Array<Child> = [
    first &&
      el(
        'text',
        { 'data-testid': 'from', class: 'calendar-foot', x: CARD_STYLE.padding.x, y: footY },
        fromText,
      ),
    last &&
      el(
        'text',
        {
          'data-testid': 'to',
          class: 'calendar-foot',
          x: width - CARD_STYLE.padding.x,
          y: footY,
          'text-anchor': 'end',
        },
        toText,
      ),
    el(
      'g',
      { 'data-testid': 'legend' },
      el('text', { class: 'calendar-foot', x: legendX, y: footY }, t.less()),
      swatches.map((level) => {
        const { fill, opacity } = levelFill(level, lightColors);
        return el('rect', {
          class: `week-${String(level)}`,
          x: swatchX + level * (calendar.swatch + calendar.cellGap),
          y: swatchY,
          width: calendar.swatch,
          height: calendar.swatch,
          rx: 2,
          fill,
          'fill-opacity': opacity,
        });
      }),
      el(
        'text',
        {
          class: 'calendar-foot',
          x: swatchX + swatchRun + calendar.legendGap,
          y: footY,
        },
        t.more(),
      ),
    ),
  ];

  // the swatches reach a pixel past the foot's baseline, below the text's ink
  const height =
    CARD_STYLE.padding.bodyOffsetY + swatchY + calendar.swatch + CARD_STYLE.padding.bottom;

  /** @returns What the card shows, in words; a card with no weeks has no span to name. */
  const describe = (): string => {
    if (!first || !last) {
      return t.descriptionNoWeeks({ total: totalText, counted });
    }
    return t.description({
      total: totalText,
      counted,
      average: averageText,
      from: fromText,
      to: toText,
      weeks: weeks.map((week) => weekCount(week.count, formatCount)).join(', '),
    });
  };

  // `role="img"` hides the inner text from assistive tech, so everything the card
  // shows has to be repeated in its description.
  const card = new Card({
    title: title ?? defaultTitleFor(t, name, width),
    titlePrefixIcon: CARD_ICON.orgCalendar,
    width,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
    description: describe(),
    hideBorder: hide_border,
    hideTitle: hide_title,
    animations: !disable_animations,
    css: (colors): Array<CssChild> => [
      rule('.calendar-total', { font: font('semibold', 'display'), fill: colors.titleColor }),
      rule('.calendar-summary', {
        font: font('regular', 'small'),
        fill: colors.textColor,
        opacity: 0.75,
      }),
      rule('.calendar-foot', {
        font: font('regular', 'micro'),
        fill: colors.textColor,
        opacity: 0.6,
      }),
      rule('.week', { animation: 'fadeInAnimation 0.3s ease-in-out backwards' }),
      rule('.week-count', { font: font('semibold', 'micro') }),
      swatches.map((level) => {
        const { fill, opacity } = levelFill(level, colors);
        return [
          rule(`.week-${String(level)}`, { fill, 'fill-opacity': opacity }),
          rule(`.week-count-${String(level)}`, { fill: inkOn(colors, fill, opacity) }),
        ];
      }),
    ],
  });

  return card.render([headline, cells, foot]);
};

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * They ride on the renderer so a list cannot be found without what draws it;
 * the api handler forwards them onto its own export, which is what a UI reads.
 */
const renderOrgCalendarCard = Object.assign(renderCard, {
  OPTIONS: {
    number_format: NUMBER_FORMATS,
  },
});

export { renderOrgCalendarCard };
