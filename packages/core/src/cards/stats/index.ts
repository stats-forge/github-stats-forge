import { CARD_ICON, CARD_STYLE } from '../../common/brand.ts';
import { Card } from '../../common/Card.ts';
import { getLightDarkColors } from '../../common/color.ts';
import { CardError } from '../../common/error.ts';
import { formatDecimal } from '../../common/fmt.ts';
import { rankIcon } from '../../common/icons.ts';
import { commonLocales } from '../../common/locales.ts';
import type { Locale } from '../../common/localize.ts';
import { localize } from '../../common/localize.ts';
import { clampValue } from '../../common/ops.ts';
import {
  NUMBER_FORMATS,
  countFormatter,
  createTextNode,
  flexLayout,
  glowingCircle,
} from '../../common/render.ts';
import type { NumberFormat } from '../../common/render.ts';
import { measureText } from '../../common/text.ts';
import type { StatsData } from '../../fetchers/stats/types.ts';
import type { CssChild } from '../../markup/index.ts';
import { el } from '../../markup/index.ts';
import type { CardOptions, CommonCardOptions } from '../options.ts';

import { statCardLocales } from './locales.ts';
import {
  getTotalCommitsRangeLabel,
  HIDE_STATS,
  percentFormatter,
  SHOW_STATS,
  statRows,
} from './rows.ts';
import { RANK_RING, getStyles } from './styles.ts';

const CARD_MIN_WIDTH = 287;
const CARD_DEFAULT_WIDTH = CARD_STYLE.width.compact;
const RANK_CARD_DEFAULT_WIDTH = CARD_STYLE.width.wide;
const RANK_ONLY_CARD_DEFAULT_WIDTH = CARD_STYLE.width.compact;
const COLUMNS_CARD_DEFAULT_WIDTH = CARD_STYLE.width.broad;

const STAT_FONT_SIZE = CARD_STYLE.fontSize.body;
/** How far a stat row is translated into the card; see `createTextNode`. */
const STAT_ROW_X = CARD_STYLE.padding.x;
/** Room the rank ring needs at the right edge, so a value never runs into it. */
const RANK_GUTTER = 120;
/** Between one column's values and the next column's labels. */
const COLUMN_GAP = 24;
/** The ring's own `cx`, which its group's translation has to make up for. */
const RANK_CIRCLE_CX_OFFSET = 10;
/** Where each spark leaves the ring's foot, as `[dx, dy, delay in s]`; uneven, so they read as embers. */
const SPARKS: ReadonlyArray<readonly [number, number, number]> = [
  [-26, -6, 0],
  [-10, 0, 1.1],
  [4, -4, 2.2],
  [18, 2, 0.6],
  [30, -8, 1.7],
];
/** `createTextNode`'s own label offset, which it applies only when icons are shown. */
const LABEL_X_OFFSET = 25;
/** Smallest gap kept between the longest label and its value. */
const LABEL_VALUE_GAP = 16;

/** Rank indicators the card can draw; the api validates `rank_icon` against this. */
const RANK_ICONS = ['default', 'github', 'percentile'] as const;
type RankIcon = (typeof RANK_ICONS)[number];

/** How the rows are laid out: one column, or two side by side for a card with many. */
const STATS_LAYOUTS = ['normal', 'columns'] as const;
type StatsLayout = (typeof STATS_LAYOUTS)[number];

/** The space between stat rows, which the card's height is measured on. */
const LINE_HEIGHT = 25;

interface StatCardOptions extends CommonCardOptions {
  locale: Locale;
  hide: Array<string>;
  show_icons: boolean;
  hide_title: boolean;
  card_width: number;
  hide_rank: boolean;
  include_all_commits: boolean;
  title: string;
  disable_animations: boolean;
  number_format: NumberFormat;
  number_precision: number;
  rank_icon: RankIcon;
  layout: StatsLayout;
  show: Array<string>;
  /** `owner/name` and `owner/*` entries the search-based stats were narrowed to, named in their labels. */
  scope: Array<string>;
}

/**
 * Renders the stats card.
 *
 * @returns The stats card SVG object.
 */
const renderCard = (stats: StatsData, options: CardOptions<StatCardOptions> = {}): string => {
  const { name, commitsRange, rank } = stats;
  const {
    hide = [],
    show_icons = false,
    hide_title = false,
    hide_border = false,
    card_width,
    hide_rank = false,
    include_all_commits = false,
    title,
    border_radius,
    scope = [],
    locale,
    disable_animations = false,
    rank_icon = 'default',
    layout = 'normal',
    show = [],
  } = options;

  const { lightColors, darkColors } = getLightDarkColors(options);

  const apostrophe = /s$/i.test(name.trim()) ? '' : 's';
  const t = localize(statCardLocales, locale);
  const formatCount = countFormatter(options);
  const formatPercent = percentFormatter(options);
  const commonT = localize(commonLocales, locale);

  const STATS = statRows(stats, { show, scope, include_all_commits, formatPercent }, t, commonT);

  // filter out hidden stats defined by user
  const visibleStats = Object.entries(STATS).filter(([key]) => !hide.includes(key));

  if (visibleStats.length === 0 && hide_rank) {
    throw CardError.because('stats_no_stats_or_rank');
  }

  // a lone row has nothing to share a line with
  const columns = layout === 'columns' && visibleStats.length > 1;
  const rowsPerColumn = columns ? Math.ceil(visibleStats.length / 2) : visibleStats.length;

  const defaultTitle =
    visibleStats.length > 0 ? t.title({ name, apostrophe }) : t.rankTitle({ name, apostrophe });
  const cardTitle = title ?? defaultTitle;

  // The rank ring sets the floor: 150 beside the stats, 180 when it is the whole card.
  const height = Math.max(
    CARD_STYLE.padding.bodyOffsetY +
      Math.max(rowsPerColumn - 1, 0) * LINE_HEIGHT +
      CARD_STYLE.statRowInk +
      CARD_STYLE.padding.bottom,
    hide_rank ? 0 : visibleStats.length > 0 ? 150 : 180,
  );

  // the lower the user's percentile the better
  const progress = 100 - rank.percentile;

  const iconWidth = show_icons && visibleStats.length > 0 ? 16 + /* padding */ 1 : 0;
  const rankGutter = hide_rank ? 0 : RANK_GUTTER;
  const widestLabel =
    visibleStats.length > 0
      ? Math.max(...visibleStats.map(([, stat]) => measureText(`${stat.label}:`, STAT_FONT_SIZE)))
      : 0;
  const labelRoom = (show_icons ? LABEL_X_OFFSET : 0) + widestLabel + LABEL_VALUE_GAP;

  // Two columns each hold their longest label and value, so the card grows rather than overlap.
  const widestValue = columns
    ? Math.max(
        ...visibleStats.map(([, { value, unitSymbol }]) =>
          measureText(
            `${typeof value === 'number' ? formatCount(value) : value}${unitSymbol ? ` ${unitSymbol}` : ''}`,
            STAT_FONT_SIZE,
          ),
        ),
      )
    : 0;
  const columnNeeds = labelRoom + widestValue;

  // The icons ride inside the step's own slack, so a default card lands on the width grid;
  // only the minimum, which has no slack, still has to make room for them.
  let defaultCardWidth: number = RANK_ONLY_CARD_DEFAULT_WIDTH;
  if (columns) {
    defaultCardWidth = Math.max(
      COLUMNS_CARD_DEFAULT_WIDTH,
      Math.ceil(2 * CARD_STYLE.padding.x + 2 * columnNeeds + COLUMN_GAP + rankGutter),
    );
  } else if (hide_rank) {
    defaultCardWidth = CARD_DEFAULT_WIDTH;
  } else if (visibleStats.length > 0) {
    defaultCardWidth = RANK_CARD_DEFAULT_WIDTH;
  }
  // Only a card sized by its own title can outgrow its step: the ranked layouts are fixed,
  // so their step is also their floor.
  const fittedWidth =
    hide_rank && !columns
      ? Math.max(
          defaultCardWidth,
          clampValue(
            2 * CARD_STYLE.padding.x + measureText(cardTitle) * 2,
            CARD_MIN_WIDTH,
            Infinity,
          ) + iconWidth,
        )
      : defaultCardWidth;
  const width = card_width ? (Number.isNaN(card_width) ? fittedWidth : card_width) : fittedWidth;

  // A value ends at the card's inner edge, clear of the rank ring — or right after
  // the longest label, on a card too narrow for that. Two columns split that room.
  const rowsRoom = width - CARD_STYLE.padding.x - STAT_ROW_X - rankGutter;
  const valueAnchorX = Math.round(
    columns ? Math.max((rowsRoom - COLUMN_GAP) / 2, columnNeeds) : Math.max(rowsRoom, labelRoom),
  );
  const secondColumnX = valueAnchorX + COLUMN_GAP;
  const rowsEnd = columns ? secondColumnX + valueAnchorX : valueAnchorX;

  // pass index so that we can calculate the line spacing
  const statItems = visibleStats.map(([, stat], index) =>
    createTextNode({
      icon: stat.icon,
      label: stat.label,
      value: stat.value,
      id: stat.id,
      unitSymbol: stat.unitSymbol,
      index,
      showIcons: show_icons,
      valueAnchorX,
      bold: true,
      labelBold: false,
      formatValue: formatCount,
      link: stat.link,
    }),
  );

  // Accessibility Labels
  const labels = visibleStats
    .map(([key, stat]) => {
      if (key === 'commits') {
        const range = include_all_commits ? '' : getTotalCommitsRangeLabel(commitsRange, commonT);
        return `${t.commits()} ${range} : ${stat.value}`;
      }
      return `${stat.label}: ${stat.value}`;
    })
    .join(', ');

  const card = new Card({
    title: cardTitle,
    titlePrefixIcon: CARD_ICON.stats,
    width,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
    accessibleTitle: t.accessibilityTitle({ title: cardTitle, level: rank.level }),
    description: labels,
    hideBorder: hide_border,
    hideTitle: hide_title,
    animations: !disable_animations,
    burns: true,
    css: ({ ringColor, textColor, titleColor, iconColor, heat }): Array<CssChild> =>
      getStyles({
        ringColor,
        textColor,
        titleColor,
        iconColor,
        sparkColor: heat[0],
        show_icons,
        progress,
      }),
  });

  /**
   * The ring sits halfway between where the values stop and the card's own edge, which is
   * the space actually visible around it; a rank-only card has no values, so it centres.
   *
   * @returns Rank circle translation value.
   */
  const calculateRankXTranslation = (): number => {
    const center = visibleStats.length > 0 ? (rowsEnd + STAT_ROW_X + width) / 2 : width / 2;
    return center + RANK_CIRCLE_CX_OFFSET;
  };

  // The middle of the room the rows fill, so the ring centres on them rather than on the title too.
  const bodyMiddle = (height - CARD_STYLE.padding.bodyOffsetY - CARD_STYLE.padding.bottom) / 2;

  // Conditionally rendered elements
  const rankCircle =
    !hide_rank &&
    el(
      'g',
      {
        'data-testid': 'rank-circle',
        transform: `translate(${calculateRankXTranslation()}, ${bodyMiddle - 8})`,
      },
      el('circle', {
        class: 'rank-circle-rim',
        cx: -RANK_CIRCLE_CX_OFFSET,
        cy: 8,
        r: RANK_RING.radius,
      }),
      glowingCircle('rank-ring', {
        class: 'rank-circle',
        cx: -RANK_CIRCLE_CX_OFFSET,
        cy: 8,
        r: RANK_RING.radius,
      }),
      el(
        'g',
        { class: 'rank-text' },
        rankIcon(rank_icon, rank.level, {
          header: t.percentileHeader(),
          value: formatDecimal(rank.percentile, locale, 1),
        }),
      ),
      SPARKS.map(([dx, dy, delay]) =>
        el('circle', {
          class: 'spark',
          cx: -RANK_CIRCLE_CX_OFFSET + dx,
          cy: 8 + RANK_RING.radius + dy,
          r: 1.7,
          style: `animation-delay: ${String(delay)}s`,
        }),
      ),
    );

  const column = (items: typeof statItems, x: number): ReturnType<typeof el> =>
    el('svg', { x, y: 0 }, flexLayout({ items, gap: LINE_HEIGHT, direction: 'column' }));

  return card.render([
    rankCircle,
    column(statItems.slice(0, rowsPerColumn), 0),
    columns && column(statItems.slice(rowsPerColumn), secondColumnX),
  ]);
};

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * They ride on the renderer so a list cannot be found without what draws it;
 * the api handler forwards them onto its own export, which is what a UI reads.
 */
const renderStatsCard = Object.assign(renderCard, {
  OPTIONS: {
    rank_icon: RANK_ICONS,
    layout: STATS_LAYOUTS,
    show: SHOW_STATS,
    hide: HIDE_STATS,
    number_format: NUMBER_FORMATS,
  },
});

export { renderStatsCard };
