import { CARD_ICON, CARD_WIDTH, FONT_SIZE, FONT_WEIGHT, font } from '../../common/brand.ts';
import { Card } from '../../common/Card.ts';
import { getLightDarkColors } from '../../common/color.ts';
import type { CardColors } from '../../common/color.ts';
import { CardError } from '../../common/error.ts';
import { icons } from '../../common/icons.ts';
import type { Localized } from '../../common/localize.ts';
import { localize } from '../../common/localize.ts';
import { NUMBER_FORMATS, createTextNode, flexLayout, measureText } from '../../common/render.ts';
import type { OrgActivityData } from '../../fetchers/types.ts';
import type { Child, CssChild } from '../../markup/index.ts';
import { rule } from '../../markup/index.ts';
import type { CardOptions, CommonCardOptions } from '../options.ts';

import { orgActivityCardLocales } from './locales.ts';

// the title names the organization and says it is one, which `standard` cannot hold
const CARD_DEFAULT_WIDTH = CARD_WIDTH.wide;
/** Padding the card keeps at its edges; matches `Card`'s own `paddingX`. */
const CARD_PADDING_X = 25;
/** How far a stat row is translated into the card; see `createTextNode`. */
const STAT_ROW_X = 25;
/** `createTextNode`'s own label offset, which it applies only when icons are shown. */
const LABEL_X_OFFSET = 25;
/** Smallest gap kept between the longest label and its value. */
const LABEL_VALUE_GAP = 16;

const TITLE_FONT_SIZE = FONT_SIZE.title;
/** What `Card`'s title layout reserves for the prefix icon, so the title text starts past it. */
const TITLE_ICON_COLUMN = 25;

/** Stats the card draws only when `show` names them. */
const SHOW_STATS = ['discussions', 'commits'] as const;
type ShowStat = (typeof SHOW_STATS)[number];

/** Stats `show` does not gate, and so the ones `hide` has anything to remove. */
const HIDE_STATS = ['prs_opened', 'prs_merged', 'issues_opened', 'issues_closed'] as const;
type HideStat = (typeof HIDE_STATS)[number];

type StatId = HideStat | ShowStat;

interface OrgActivityCardOptions extends CommonCardOptions {
  locale: string;
  hide: Array<string>;
  show: Array<string>;
  show_icons: boolean;
  hide_title: boolean;
  card_width: number;
  line_height: number | string;
  custom_title: string;
  disable_animations: boolean;
  number_format: string;
  text_bold: boolean;
}

/** Meta data for a stat, used to build its text node and accessibility label. */
interface StatItem {
  icon: Child;
  label: string;
  value: number;
  id: string;
}

/**
 * The title, naming the organization unless that makes it too wide for the card.
 *
 * The window is composed onto it in parentheses rather than written into the wording,
 * so both halves keep whatever translations they have — see the wakatime card's own.
 *
 * @returns The default title, which `custom_title` still overrides.
 */
const defaultTitleFor = (
  t: Localized<typeof orgActivityCardLocales>,
  name: string,
  days: number,
  contentWidth: number,
): string => {
  const window = ` (${t.lastDays({ count: days })})`;
  const apostrophe = /s$/i.test(name.trim()) ? '' : 's';
  const named = `${t.title({ name, apostrophe })}${window}`;
  return measureText(named, TITLE_FONT_SIZE) <= contentWidth
    ? named
    : `${t.titleUnnamed()}${window}`;
};

/**
 * @returns Card CSS styles.
 */
const getStyles = ({
  textColor,
  iconColor,
  show_icons,
}: {
  textColor: string;
  iconColor: string;
  show_icons: boolean;
}): Array<CssChild> => [
  rule('.stat', {
    font: font('regular', 'body'),
    fill: textColor,
    'font-variant-numeric': 'tabular-nums',
  }),
  rule('.stagger', { opacity: 0, animation: 'fadeInAnimation 0.3s ease-in-out forwards' }),
  rule('.not_bold', { 'font-weight': FONT_WEIGHT.regular, opacity: 0.75 }),
  rule('.bold', { 'font-weight': FONT_WEIGHT.semibold }),
  rule('.icon', { fill: iconColor, opacity: 0.75, display: show_icons ? 'block' : 'none' }),
];

/**
 * Renders what an organization did over a window.
 *
 * @returns The organization activity card SVG object.
 */
const renderCard = (
  data: OrgActivityData,
  options: CardOptions<OrgActivityCardOptions> = {},
): string => {
  const {
    name,
    days,
    prsOpened,
    prsMerged,
    issuesOpened,
    issuesClosed,
    discussionsOpened,
    commits,
  } = data;
  const {
    hide = [],
    show = [],
    show_icons = true,
    hide_title = false,
    hide_border = false,
    card_width,
    line_height = 25,
    text_bold = true,
    custom_title,
    border_radius,
    number_format = 'short',
    locale,
    disable_animations = false,
  } = options;

  const lheight = Number.parseInt(String(line_height), 10);

  const { lightColors, darkColors } = getLightDarkColors(options);

  // Typed against the exported list, so a stat drawn here cannot be missing from it.
  const shows = (stat: ShowStat): boolean => show.includes(stat);

  const t = localize(orgActivityCardLocales, locale);

  const STATS: Partial<Record<StatId, StatItem>> = {
    prs_opened: {
      icon: icons.prs,
      label: t.prsOpened(),
      value: prsOpened,
      id: 'prs_opened',
    },
    prs_merged: {
      icon: icons.prs_merged,
      label: t.prsMerged(),
      value: prsMerged,
      id: 'prs_merged',
    },
  };

  // A refused issue count is `null`, and no row is better than one carrying the PR count.
  if (issuesOpened !== null) {
    STATS['issues_opened'] = {
      icon: icons.issues,
      label: t.issuesOpened(),
      value: issuesOpened,
      id: 'issues_opened',
    };
  }

  if (issuesClosed !== null) {
    STATS['issues_closed'] = {
      icon: icons.discussions_answered,
      label: t.issuesClosed(),
      value: issuesClosed,
      id: 'issues_closed',
    };
  }

  if (shows('discussions')) {
    STATS['discussions'] = {
      icon: icons.discussions_started,
      label: t.discussions(),
      value: discussionsOpened,
      id: 'discussions',
    };
  }

  // A commit count nobody asked the fetcher for is `null`, and no row is better than one reading "0".
  if (shows('commits') && commits !== null) {
    STATS['commits'] = {
      icon: icons.commits,
      label: t.commits(),
      value: commits,
      id: 'commits',
    };
  }

  const visibleStats = Object.entries(STATS).filter(([key]) => !hide.includes(key));

  if (visibleStats.length === 0) {
    throw new CardError('Could not render organization activity card.', {
      code: 'invalid_param',
      secondaryMessage: 'At least one stat is required.',
    });
  }

  const width = card_width && !Number.isNaN(card_width) ? card_width : CARD_DEFAULT_WIDTH;

  const height = 45 + (visibleStats.length + 1) * lheight;

  // A value ends at the card's inner edge — or right after the longest label,
  // on a card too narrow for that.
  const widestLabel = Math.max(
    ...visibleStats.map(([, stat]) => measureText(`${stat.label}:`, FONT_SIZE.body)),
  );
  const valueAnchorX = Math.round(
    Math.max(
      width - CARD_PADDING_X - STAT_ROW_X,
      (show_icons ? LABEL_X_OFFSET : 0) + widestLabel + LABEL_VALUE_GAP,
    ),
  );

  const statItems = visibleStats.map(([, stat], index) =>
    createTextNode({
      icon: stat.icon,
      label: stat.label,
      value: stat.value,
      id: stat.id,
      index,
      showIcons: show_icons,
      shiftValuePos: 0,
      valueAnchorX,
      bold: text_bold,
      labelBold: false,
      numberFormat: number_format,
    }),
  );

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: defaultTitleFor(t, name, days, width - 2 * CARD_PADDING_X - TITLE_ICON_COLUMN),
    titlePrefixIcon: CARD_ICON.orgActivity,
    width,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
  });

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  const cardStyles = ({ textColor, iconColor }: CardColors): Array<CssChild> =>
    getStyles({ textColor, iconColor, show_icons });
  card.setCSS({ light: cardStyles, dark: cardStyles });

  if (disable_animations) {
    card.disableAnimations();
  }

  // `role="img"` hides the inner text from assistive tech, so everything the card
  // shows has to be repeated here.
  card.setAccessibilityLabel({
    title: card.title,
    desc: visibleStats.map(([, stat]) => `${stat.label}: ${String(stat.value)}`).join(', '),
  });

  return card.render(flexLayout({ items: statItems, gap: lheight, direction: 'column' }));
};

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * They ride on the renderer so a list cannot be found without what draws it;
 * the api handler forwards them onto its own export, which is what a UI reads.
 */
const renderOrgActivityCard = Object.assign(renderCard, {
  OPTIONS: {
    show: SHOW_STATS,
    hide: HIDE_STATS,
    number_format: NUMBER_FORMATS,
  },
});

export { renderOrgActivityCard };
