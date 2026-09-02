import { Card } from '../common/Card.js';
import { getLightDarkColors } from '../common/color.js';
import type { CardColors } from '../common/color.js';
import { CardError } from '../common/error.js';
import { I18n } from '../common/I18n.js';
import { icons, rankIcon } from '../common/icons.js';
import { buildSearchFilter, clampValue } from '../common/ops.js';
import { createTextNode, flexLayout, measureText } from '../common/render.js';
import type { StatsData } from '../fetchers/types.js';
import type { Child, CssChild } from '../markup/index.js';
import { atRule, cssComment, el, rule } from '../markup/index.js';
import { statCardLocales, wakatimeCardLocales } from '../translations.js';

import type { CardOptions, CommonCardOptions } from './options.js';

const CARD_MIN_WIDTH = 287;
const CARD_DEFAULT_WIDTH = 287;
const RANK_CARD_MIN_WIDTH = 420;
const RANK_CARD_DEFAULT_WIDTH = 450;
const RANK_ONLY_CARD_MIN_WIDTH = 290;
const RANK_ONLY_CARD_DEFAULT_WIDTH = 290;

const STAT_FONT_SIZE = 14;
/** Padding the card keeps at its edges; matches `Card`'s own `paddingX`. */
const CARD_PADDING_X = 25;
/** How far a stat row is translated into the card; see `createTextNode`. */
const STAT_ROW_X = 25;
/** Room the rank ring needs at the right edge, so a value never runs into it. */
const RANK_GUTTER = 120;
/** `createTextNode`'s own label offset, which it applies only when icons are shown. */
const LABEL_X_OFFSET = 25;
/** Smallest gap kept between the longest label and its value. */
const LABEL_VALUE_GAP = 16;

/** Rank indicators the card can draw; the api validates `rank_icon` against this. */
const RANK_ICONS = ['default', 'github', 'percentile'] as const;
type RankIcon = (typeof RANK_ICONS)[number];

interface StatCardOptions extends CommonCardOptions {
  locale: string;
  hide: Array<string>;
  show_icons: boolean;
  hide_title: boolean;
  card_width: number;
  hide_rank: boolean;
  include_all_commits: boolean;
  commits_year: number;
  line_height: number | string;
  custom_title: string;
  disable_animations: boolean;
  number_format: string;
  number_precision: number;
  ring_color: string;
  text_bold: boolean;
  rank_icon: RankIcon;
  show: Array<string>;
}

/** Meta data for a stat, used to build its text node and accessibility label. */
interface StatItem {
  icon: Child;
  label: string;
  value: number | string;
  id: string;
  unitSymbol?: string;
  link?: string;
}

/** Long locales that need more space for text. Keep sorted alphabetically. */
const LONG_LOCALES: Array<string> = [
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
];

/**
 * Calculates progress along the boundary of the circle, i.e. its circumference.
 *
 * @param value The rank value to calculate progress for.
 * @returns Progress value.
 */
const calculateCircleProgress = (value: number): number => {
  const radius = 40;
  const c = Math.PI * (radius * 2);

  if (value < 0) {
    value = 0;
  }
  if (value > 100) {
    value = 100;
  }

  return ((100 - value) / 100) * c;
};

/**
 * Retrieves the animation to display progress along the circumference of circle
 * from the beginning to the given value in a clockwise direction.
 *
 * @param props The props object.
 * @param props.progress The progress value to animate to.
 * @returns Progress animation css.
 */
const getProgressAnimation = ({ progress }: { progress: number }): CssChild =>
  atRule(
    '@keyframes rankAnimation',
    rule('from', { 'stroke-dashoffset': calculateCircleProgress(0) }),
    rule('to', { 'stroke-dashoffset': calculateCircleProgress(progress) }),
  );

/**
 * Retrieves CSS styles for a card.
 *
 * @param colors The colors to use for the card.
 * @param colors.textColor The text color.
 * @param colors.iconColor The icon color.
 * @param colors.ringColor The ring color.
 * @param colors.show_icons Whether to show icons.
 * @param colors.progress The progress value to animate to.
 * @returns Card CSS styles.
 */
const getStyles = ({
  textColor,
  iconColor,
  ringColor,
  show_icons,
  progress,
}: {
  textColor: string;
  iconColor: string;
  ringColor: string;
  show_icons: boolean;
  progress: number;
}): Array<CssChild> => {
  return [
    rule('.stat', {
      font: `400 ${STAT_FONT_SIZE}px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif`,
      fill: textColor,
      'font-variant-numeric': 'tabular-nums',
    }),
    atRule(
      '@supports(-moz-appearance: auto)',
      cssComment('Selector detects Firefox'),
      rule('.stat', { 'font-size': '12px' }),
    ),
    rule('.stagger', { opacity: 0, animation: 'fadeInAnimation 0.3s ease-in-out forwards' }),
    rule('.rank-text', {
      font: "700 22px 'Segoe UI', Ubuntu, Sans-Serif",
      fill: textColor,
      animation: 'scaleInAnimation 0.3s ease-in-out forwards',
    }),
    rule('.rank-percentile-header', { 'font-size': '14px' }),
    rule('.rank-percentile-text', { 'font-size': '16px' }),
    cssComment('Labels recede so that the values read first.'),
    rule('.not_bold', { 'font-weight': 400, opacity: 0.75 }),
    rule('.bold', { 'font-weight': 600 }),
    rule('.icon', {
      fill: iconColor,
      opacity: 0.75,
      display: show_icons ? 'block' : 'none',
    }),
    rule('.rank-circle-rim', {
      stroke: ringColor,
      fill: 'none',
      'stroke-width': 4,
      opacity: 0.15,
    }),
    rule('.rank-circle', {
      stroke: ringColor,
      'stroke-dasharray': 250,
      fill: 'none',
      'stroke-width': 4,
      'stroke-linecap': 'round',
      opacity: 1,
      'transform-origin': '-10px 8px',
      transform: 'rotate(-90deg)',
      animation: 'rankAnimation 0.8s forwards ease-in-out',
    }),
    getProgressAnimation({ progress }),
  ];
};

/**
 * Return the label for commits according to the selected options
 *
 * @param include_all_commits Option to include all years
 * @param commits_year Option to include only selected year
 * @param i18n The I18n instance.
 * @returns The label corresponding to the options.
 */
const getTotalCommitsYearLabel = (
  include_all_commits: boolean,
  commits_year: number | undefined,
  i18n: I18n,
): string =>
  include_all_commits
    ? ''
    : commits_year
      ? ` (${commits_year})`
      : ` (${i18n.t('wakatimecard.lastyear')})`;

/**
 * Renders the stats card.
 *
 * @param stats The stats data.
 * @param options The card options.
 * @param username GitHub username, used to build stat search links.
 * @param repo Repositories to scope the search links to.
 * @param owner Owners to scope the search links to.
 * @returns The stats card SVG object.
 */
const renderStatsCard = (
  stats: StatsData,
  options: CardOptions<StatCardOptions> = {},
  username?: string,
  repo: Array<string> = [],
  owner: Array<string> = [],
): string => {
  const {
    name,
    totalStars,
    totalCommits,
    totalIssues,
    totalPRs,
    totalPRsMerged,
    mergedPRsPercentage,
    totalReviews,
    totalDiscussionsStarted,
    totalDiscussionsAnswered,
    contributedTo,
    allTimeContributedTo,
    totalPRsAuthored,
    totalPRsCommented,
    totalPRsReviewed,
    totalIssuesAuthored,
    totalIssuesCommented,
    totalContributions,
    rank,
  } = stats;
  const {
    hide = [],
    show_icons = false,
    hide_title = false,
    hide_border = false,
    card_width,
    hide_rank = false,
    include_all_commits = false,
    commits_year,
    line_height = 25,
    text_bold = true,
    custom_title,
    border_radius,
    number_format = 'short',
    number_precision,
    locale,
    disable_animations = false,
    rank_icon = 'default',
    show = [],
  } = options;

  const lheight = parseInt(String(line_height), 10);

  const { lightColors, darkColors } = getLightDarkColors(options);

  const apostrophe = /s$/i.test(name.trim()) ? '' : 's';
  const i18n = new I18n({
    locale,
    translations: {
      ...statCardLocales({ name, apostrophe }),
      ...wakatimeCardLocales,
    },
  });

  // Meta data for creating text nodes with createTextNode function
  const STATS: Record<string, StatItem> = {};

  STATS['stars'] = {
    icon: icons.star,
    label: i18n.t('statcard.totalstars'),
    value: totalStars,
    id: 'stars',
  };

  if (show.includes('contributions')) {
    STATS['contributions'] = {
      icon: icons.contributions,
      label: i18n.t('statcard.contributions'),
      value: totalContributions,
      id: 'contributions',
    };
  }

  STATS['commits'] = {
    icon: icons.commits,
    label: `${i18n.t('statcard.commits')}${getTotalCommitsYearLabel(
      include_all_commits,
      commits_year,
      i18n,
    )}`,
    value: totalCommits,
    id: 'commits',
  };
  STATS['prs'] = {
    icon: icons.prs,
    label: i18n.t('statcard.prs'),
    value: totalPRs,
    id: 'prs',
  };

  if (show.includes('prs_merged')) {
    STATS['prs_merged'] = {
      icon: icons.prs_merged,
      label: i18n.t('statcard.prs-merged'),
      value: totalPRsMerged,
      id: 'prs_merged',
    };
  }

  if (show.includes('prs_merged_percentage')) {
    STATS['prs_merged_percentage'] = {
      icon: icons.prs_merged_percentage,
      label: i18n.t('statcard.prs-merged-percentage'),
      value: mergedPRsPercentage.toFixed(
        number_precision !== undefined && Number.isFinite(number_precision)
          ? clampValue(number_precision, 0, 2)
          : 2,
      ),
      id: 'prs_merged_percentage',
      unitSymbol: '%',
    };
  }

  if (show.includes('reviews')) {
    STATS['reviews'] = {
      icon: icons.reviews,
      label: i18n.t('statcard.reviews'),
      value: totalReviews,
      id: 'reviews',
    };
  }

  STATS['issues'] = {
    icon: icons.issues,
    label: i18n.t('statcard.issues'),
    value: totalIssues,
    id: 'issues',
  };

  if (show.includes('discussions_started')) {
    STATS['discussions_started'] = {
      icon: icons.discussions_started,
      label: i18n.t('statcard.discussions-started'),
      value: totalDiscussionsStarted,
      id: 'discussions_started',
    };
  }
  if (show.includes('discussions_answered')) {
    STATS['discussions_answered'] = {
      icon: icons.discussions_answered,
      label: i18n.t('statcard.discussions-answered'),
      value: totalDiscussionsAnswered,
      id: 'discussions_answered',
    };
  }

  const repoFilter = encodeURIComponent(buildSearchFilter(repo, owner));
  const encodedUsername = encodeURIComponent(username ?? '');
  if (show.includes('prs_authored')) {
    STATS['prs_authored'] = {
      icon: icons.prs,
      label: i18n.t('statcard.prs-authored'),
      value: totalPRsAuthored,
      id: 'prs_authored',
      link: `https://github.com/search?q=${repoFilter}author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (show.includes('prs_commented')) {
    STATS['prs_commented'] = {
      icon: icons.comments,
      label: i18n.t('statcard.prs-commented'),
      value: totalPRsCommented,
      id: 'prs_commented',
      link: `https://github.com/search?q=${repoFilter}commenter%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (show.includes('prs_reviewed')) {
    STATS['prs_reviewed'] = {
      icon: icons.reviews,
      label: i18n.t('statcard.prs-reviewed'),
      value: totalPRsReviewed,
      id: 'prs_reviewed',
      link: `https://github.com/search?q=${repoFilter}reviewed-by%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (show.includes('issues_authored')) {
    STATS['issues_authored'] = {
      icon: icons.issues,
      label: i18n.t('statcard.issues-authored'),
      value: totalIssuesAuthored,
      id: 'issues_authored',
      link: `https://github.com/search?q=${repoFilter}author%3A${encodedUsername}&amp;type=issues`,
    };
  }
  if (show.includes('issues_commented')) {
    STATS['issues_commented'] = {
      icon: icons.discussions_started,
      label: i18n.t('statcard.issues-commented'),
      value: totalIssuesCommented,
      id: 'issues_commented',
      link: `https://github.com/search?q=${repoFilter}commenter%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=issues`,
    };
  }

  STATS['contribs'] = {
    icon: icons.contribs,
    label: i18n.t('statcard.contribs'),
    value: contributedTo,
    id: 'contribs',
  };

  if (show.includes('all_time_contribs')) {
    STATS['all_time_contribs'] = {
      icon: icons.contribs,
      label: i18n.t('statcard.all-time-contribs'),
      value: allTimeContributedTo,
      id: 'all_time_contribs',
    };
  }

  const isLongLocale = locale ? LONG_LOCALES.includes(locale) : false;

  // filter out hidden stats defined by user
  const visibleStats = Object.entries(STATS).filter(([key]) => !hide.includes(key));

  if (visibleStats.length === 0 && hide_rank) {
    throw new CardError('Could not render stats card.', {
      code: 'invalid_param',
      secondaryMessage: 'Either stats or rank are required.',
    });
  }

  // check if all used labels are short
  const longLabels = visibleStats.some(([, stat]) => stat.label.length > 18);

  // Calculate the card height depending on how many items there are
  // but if rank circle is visible clamp the minimum height to `150`
  const height = Math.max(
    45 + (visibleStats.length + 1) * lheight,
    hide_rank ? 0 : visibleStats.length ? 150 : 180,
  );

  // the lower the user's percentile the better
  const progress = 100 - rank.percentile;

  const calculateTextWidth = () => {
    return measureText(
      custom_title
        ? custom_title
        : visibleStats.length
          ? i18n.t('statcard.title')
          : i18n.t('statcard.ranktitle'),
    );
  };

  /*
    When hide_rank=true, the minimum card width is 270 px + the title length and padding.
    When hide_rank=false, the minimum card_width is 340 px + the icon width (if show_icons=true).
    Numbers are picked by looking at existing dimensions on production.
  */
  const iconWidth = show_icons && visibleStats.length ? 16 + /* padding */ 1 : 0;
  const minCardWidth =
    (hide_rank
      ? clampValue(50 /* padding */ + calculateTextWidth() * 2, CARD_MIN_WIDTH, Infinity)
      : visibleStats.length
        ? RANK_CARD_MIN_WIDTH
        : RANK_ONLY_CARD_MIN_WIDTH) + iconWidth;
  const defaultCardWidth =
    (hide_rank
      ? CARD_DEFAULT_WIDTH
      : visibleStats.length
        ? RANK_CARD_DEFAULT_WIDTH
        : RANK_ONLY_CARD_DEFAULT_WIDTH) + iconWidth;
  const width = card_width
    ? isNaN(card_width)
      ? Math.max(defaultCardWidth, minCardWidth)
      : card_width
    : Math.max(defaultCardWidth, minCardWidth);

  // A value ends at the card's inner edge, clear of the rank ring — or right after
  // the longest label, on a card too narrow for that.
  const widestLabel = visibleStats.length
    ? Math.max(...visibleStats.map(([, stat]) => measureText(`${stat.label}:`, STAT_FONT_SIZE)))
    : 0;
  const valueAnchorX = Math.round(
    Math.max(
      width - CARD_PADDING_X - STAT_ROW_X - (hide_rank ? 0 : RANK_GUTTER),
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
      bold: text_bold,
      labelBold: false,
      numberFormat: number_format,
      numberPrecision: number_precision,
      link: stat.link,
    }),
  );

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: visibleStats.length ? i18n.t('statcard.title') : i18n.t('statcard.ranktitle'),
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
   * Calculates the right rank circle translation values such that the rank circle
   * keeps respecting the following padding:
   *
   * width > RANK_CARD_DEFAULT_WIDTH: The default right padding of 70 px will be used.
   * width < RANK_CARD_DEFAULT_WIDTH: The left and right padding will be enlarged
   *   equally from a certain minimum at RANK_CARD_MIN_WIDTH.
   *
   * @returns Rank circle translation value.
   */
  const calculateRankXTranslation = (): number => {
    if (visibleStats.length) {
      const minXTranslation = RANK_CARD_MIN_WIDTH + iconWidth - 70;
      if (width > RANK_CARD_DEFAULT_WIDTH) {
        const xMaxExpansion = minXTranslation + (450 - minCardWidth) / 2;
        return xMaxExpansion + width - RANK_CARD_DEFAULT_WIDTH;
      } else {
        return minXTranslation + (width - minCardWidth) / 2;
      }
    } else {
      return width / 2 + 20 - 10;
    }
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
      el('circle', { class: 'rank-circle-rim', cx: -10, cy: 8, r: 40 }),
      el('circle', { class: 'rank-circle', cx: -10, cy: 8, r: 40 }),
      el('g', { class: 'rank-text' }, rankIcon(rank_icon, rank.level, rank.percentile)),
    );

  // Accessibility Labels
  const labels = visibleStats
    .map(([key, stat]) => {
      if (key === 'commits') {
        return `${i18n.t('statcard.commits')} ${getTotalCommitsYearLabel(
          include_all_commits,
          commits_year,
          i18n,
        )} : ${stat.value}`;
      }
      return `${stat.label}: ${stat.value}`;
    })
    .join(', ');

  card.setAccessibilityLabel({
    title: `${card.title}, Rank: ${rank.level}`,
    desc: labels,
  });

  return card.render([
    rankCircle,
    el('svg', { x: 0, y: 0 }, flexLayout({ items: statItems, gap: lheight, direction: 'column' })),
  ]);
};

export { RANK_ICONS, renderStatsCard };
