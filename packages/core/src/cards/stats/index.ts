import { CARD_ICON, CARD_STYLE } from '../../common/brand.ts';
import { Card } from '../../common/Card.ts';
import { getLightDarkColors } from '../../common/color.ts';
import type { CardColors } from '../../common/color.ts';
import { CardError } from '../../common/error.ts';
import { rankIcon } from '../../common/icons.ts';
import { commonLocales } from '../../common/locales.ts';
import { localize } from '../../common/localize.ts';
import { clampValue } from '../../common/ops.ts';
import { NUMBER_FORMATS, createTextNode, flexLayout } from '../../common/render.ts';
import { measureText } from '../../common/text.ts';
import type { StatsData } from '../../fetchers/types.ts';
import type { CssChild } from '../../markup/index.ts';
import { el } from '../../markup/index.ts';
import type { CardOptions, CommonCardOptions } from '../options.ts';

import { statCardLocales } from './locales.ts';
import { getTotalCommitsRangeLabel, HIDE_STATS, SHOW_STATS, statRows } from './rows.ts';
import { getStyles } from './styles.ts';

const CARD_MIN_WIDTH = 287;
const CARD_DEFAULT_WIDTH = CARD_STYLE.width.compact;
const RANK_CARD_DEFAULT_WIDTH = CARD_STYLE.width.wide;
const RANK_ONLY_CARD_DEFAULT_WIDTH = CARD_STYLE.width.compact;

const STAT_FONT_SIZE = CARD_STYLE.fontSize.body;
/** How far a stat row is translated into the card; see `createTextNode`. */
const STAT_ROW_X = 25;
/** Room the rank ring needs at the right edge, so a value never runs into it. */
const RANK_GUTTER = 120;
/** The ring's own `cx`, which its group's translation has to make up for. */
const RANK_CIRCLE_CX_OFFSET = 10;
/** `createTextNode`'s own label offset, which it applies only when icons are shown. */
const LABEL_X_OFFSET = 25;
/** Smallest gap kept between the longest label and its value. */
const LABEL_VALUE_GAP = 16;

/** Rank indicators the card can draw; the api validates `rank_icon` against this. */
const RANK_ICONS = ['default', 'github', 'percentile'] as const;
type RankIcon = (typeof RANK_ICONS)[number];

/** The space between stat rows, which the card's height is measured on. */
const LINE_HEIGHT = 25;

interface StatCardOptions extends CommonCardOptions {
  locale: string;
  hide: Array<string>;
  show_icons: boolean;
  hide_title: boolean;
  card_width: number;
  hide_rank: boolean;
  include_all_commits: boolean;
  title: string;
  disable_animations: boolean;
  number_format: string;
  number_precision: number;
  ring_color: string;
  rank_icon: RankIcon;
  show: Array<string>;
  /** `owner/name` and `owner/*` entries the search-based stats were narrowed to, named in their labels. */
  scope: Array<string>;
}

/** Long locales that need more space for text. Keep sorted alphabetically. */
const LONG_LOCALES: ReadonlySet<string> = new Set([
  'az',
  'bg',
  'cs',
  'de',
  'el',
  'es',
  'fil',
  'fi',
  'fr',
  'hu',
  'id',
  'ja',
  'ml',
  'my',
  'nl',
  'pl',
  'pt-br',
  'pt-pt',
  'ru',
  'sr',
  'sr-latn',
  'sw',
  'ta',
  'uk-ua',
  'uz',
  'zh-tw',
]);

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
    number_format = 'short',
    scope = [],
    number_precision,
    locale,
    disable_animations = false,
    rank_icon = 'default',
    show = [],
  } = options;

  const { lightColors, darkColors } = getLightDarkColors(options);

  const apostrophe = /s$/i.test(name.trim()) ? '' : 's';
  const t = localize(statCardLocales, locale);
  const commonT = localize(commonLocales, locale);

  const STATS = statRows(stats, { show, scope, include_all_commits, number_precision }, t, commonT);

  const isLongLocale = locale ? LONG_LOCALES.has(locale) : false;

  // filter out hidden stats defined by user
  const visibleStats = Object.entries(STATS).filter(([key]) => !hide.includes(key));

  if (visibleStats.length === 0 && hide_rank) {
    throw CardError.because('stats_no_stats_or_rank');
  }

  // check if all used labels are short
  const defaultTitle =
    visibleStats.length > 0 ? t.title({ name, apostrophe }) : t.rankTitle({ name, apostrophe });

  const longLabels = visibleStats.some(([, stat]) => stat.label.length > 18);

  // The rank ring sets the floor: 150 beside the stats, 180 when it is the whole card.
  const height = Math.max(
    CARD_STYLE.padding.bodyOffsetY +
      Math.max(visibleStats.length - 1, 0) * LINE_HEIGHT +
      CARD_STYLE.statRowInk +
      CARD_STYLE.padding.bottom,
    hide_rank ? 0 : visibleStats.length > 0 ? 150 : 180,
  );

  // the lower the user's percentile the better
  const progress = 100 - rank.percentile;

  const calculateTextWidth = (): number => measureText(title || defaultTitle);

  const iconWidth = show_icons && visibleStats.length > 0 ? 16 + /* padding */ 1 : 0;
  // The icons ride inside the step's own slack, so a default card lands on the width grid;
  // only the minimum, which has no slack, still has to make room for them.
  let defaultCardWidth: number = RANK_ONLY_CARD_DEFAULT_WIDTH;
  if (hide_rank) {
    defaultCardWidth = CARD_DEFAULT_WIDTH;
  } else if (visibleStats.length > 0) {
    defaultCardWidth = RANK_CARD_DEFAULT_WIDTH;
  }
  // Only a card sized by its own title can outgrow its step: the ranked layouts are fixed,
  // so their step is also their floor.
  const fittedWidth = hide_rank
    ? Math.max(
        defaultCardWidth,
        clampValue(50 /* padding */ + calculateTextWidth() * 2, CARD_MIN_WIDTH, Infinity) +
          iconWidth,
      )
    : defaultCardWidth;
  const width = card_width ? (Number.isNaN(card_width) ? fittedWidth : card_width) : fittedWidth;

  // A value ends at the card's inner edge, clear of the rank ring — or right after
  // the longest label, on a card too narrow for that.
  const widestLabel =
    visibleStats.length > 0
      ? Math.max(...visibleStats.map(([, stat]) => measureText(`${stat.label}:`, STAT_FONT_SIZE)))
      : 0;
  const valueAnchorX = Math.round(
    Math.max(
      width - CARD_STYLE.padding.x - STAT_ROW_X - (hide_rank ? 0 : RANK_GUTTER),
      (show_icons ? LABEL_X_OFFSET : 0) + widestLabel + LABEL_VALUE_GAP,
    ),
  );

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
      shiftValuePos: 29.01 + (longLabels ? 50 : 0) + (isLongLocale ? 50 : 0),
      valueAnchorX,
      bold: true,
      labelBold: false,
      numberFormat: number_format,
      numberPrecision: number_precision,
      link: stat.link,
    }),
  );

  const card = new Card({
    customTitle: title,
    defaultTitle,
    titlePrefixIcon: CARD_ICON.stats,
    width,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
  });

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  const cardStyles = ({ ringColor, textColor, iconColor }: CardColors): Array<CssChild> =>
    getStyles({ ringColor, textColor, iconColor, show_icons, progress });

  card.setCSS({ light: cardStyles, dark: cardStyles });

  if (disable_animations) {
    card.disableAnimations();
  }

  /**
   * The ring sits halfway between where the values stop and the card's own edge, which is
   * the space actually visible around it; a rank-only card has no values, so it centres.
   *
   * @returns Rank circle translation value.
   */
  const calculateRankXTranslation = (): number => {
    const center = visibleStats.length > 0 ? (valueAnchorX + STAT_ROW_X + width) / 2 : width / 2;
    return center + RANK_CIRCLE_CX_OFFSET;
  };

  // Conditionally rendered elements
  const rankCircle =
    !hide_rank &&
    el(
      'g',
      {
        'data-testid': 'rank-circle',
        transform: `translate(${calculateRankXTranslation()}, ${height / 2 - 50})`,
      },
      el('circle', { class: 'rank-circle-rim', cx: -RANK_CIRCLE_CX_OFFSET, cy: 8, r: 40 }),
      el('circle', { class: 'rank-circle', cx: -RANK_CIRCLE_CX_OFFSET, cy: 8, r: 40 }),
      el('g', { class: 'rank-text' }, rankIcon(rank_icon, rank.level, rank.percentile)),
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

  card.setAccessibilityLabel({
    title: t.accessibilityTitle({ title: card.title, level: rank.level }),
    desc: labels,
  });

  return card.render([
    rankCircle,
    el(
      'svg',
      { x: 0, y: 0 },
      flexLayout({ items: statItems, gap: LINE_HEIGHT, direction: 'column' }),
    ),
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
    show: SHOW_STATS,
    hide: HIDE_STATS,
    number_format: NUMBER_FORMATS,
  },
});

export { renderStatsCard };
