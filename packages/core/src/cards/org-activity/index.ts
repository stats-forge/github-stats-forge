import {
  CARD_STYLE,
  Card,
  HEAT_PAINT,
  NUMBER_FORMATS,
  atRule,
  countFormatter,
  createProgressNode,
  createTextNode,
  el,
  flexLayout,
  font,
  getLightDarkColors,
  icons,
  localize,
  measureText,
  rule,
  titleFits,
} from '@stats-forge/card-kit';
import type { Child, CssChild, Locale, Localized, NumberFormat } from '@stats-forge/card-kit';

import { CARD_ICON } from '../../common/brand.ts';
import { formatRange } from '../../common/date.ts';
import { CardError } from '../../common/error.ts';
import type { OrgActivityData } from '../../fetchers/org-activity/types.ts';
import type { CardOptions, CommonCardOptions } from '../options.ts';

import { orgActivityCardLocales } from './locales.ts';

// the title names the organization and says it is one, which `standard` cannot hold
const CARD_DEFAULT_WIDTH = CARD_STYLE.width.wide;
/** How far a stat row is translated into the card; see `createTextNode`. */
const STAT_ROW_X = CARD_STYLE.padding.x;
/** `createTextNode`'s own label offset, which it applies only when icons are shown. */
const LABEL_X_OFFSET = 25;
/** Smallest gap kept between the longest label and its value. */
const LABEL_VALUE_GAP = 16;

/** Stats the card draws only when `show` names them. */
const SHOW_STATS = ['discussions_started', 'commits'] as const;
type ShowStat = (typeof SHOW_STATS)[number];

/** Stats `show` does not gate, and so the ones `hide` has anything to remove. */
const HIDE_STATS = ['prs_opened', 'prs_merged', 'issues_opened', 'issues_closed'] as const;
type HideStat = (typeof HIDE_STATS)[number];

type StatId = HideStat | ShowStat;

/** The space between stat rows, which the card's height is measured on. */
const LINE_HEIGHT = 25;

interface OrgActivityCardOptions extends CommonCardOptions {
  locale: Locale;
  hide: Array<string>;
  show: Array<string>;
  show_icons: boolean;
  hide_title: boolean;
  card_width: number;
  title: string;
  disable_animations: boolean;
  number_format: NumberFormat;
  number_precision: number;
}

/** Meta data for a stat, used to build its text node and accessibility label. */
interface StatItem {
  icon: Child;
  label: string;
  value: number;
  id: string;
}

/** Two stats drawn as one row: the counts on the stat line, a bar comparing them under it. */
interface FlowItem {
  icon: Child;
  label: string;
  value: string;
  id: string;
  /** The second count as a share of the first; past 100 when more closed than opened. */
  progress: number;
}

/** A row of the card: one stat, or a pair drawn as a flow. */
type Row = { stat: StatItem } | { flow: FlowItem };

/** The pairs drawn as a flow when both halves are shown: what came in, then what was done. */
const FLOWS = [
  ['prs_opened', 'prs_merged', 'prs'],
  ['issues_opened', 'issues_closed', 'issues'],
] as const;

/**
 * How far what was done keeps up with what came in.
 *
 * @returns A percentage: full when something was done and nothing came in, empty when neither.
 */
const keepingUp = (opened: number, done: number): number => {
  if (opened === 0) {
    return done > 0 ? 100 : 0;
  }
  return (done / opened) * 100;
};

/**
 * The title, naming the organization unless that makes it too wide for the card.
 *
 * The window is composed onto it in parentheses rather than written into the wording,
 * so both halves keep whatever translations they have — see the wakatime card's own.
 *
 * @returns The default title, which `title` still overrides.
 */
const defaultTitleFor = (
  t: Localized<typeof orgActivityCardLocales>,
  name: string,
  { days, range }: Pick<OrgActivityData, 'days' | 'range'>,
  cardWidth: number,
): string => {
  const window =
    days === undefined ? ` (${formatRange(range)})` : ` (${t.lastDays({ count: days })})`;
  const apostrophe = /s$/i.test(name.trim()) ? '' : 's';
  const named = `${t.title({ name, apostrophe })}${window}`;
  if (titleFits(named, cardWidth)) {
    return named;
  }
  return `${t.titleUnnamed()}${window}`;
};

/**
 * @returns Card CSS styles.
 */
const getStyles = ({
  textColor,
  iconColor,
  progBarBgColor,
  show_icons,
}: {
  textColor: string;
  iconColor: string;
  progBarBgColor: string;
  show_icons: boolean;
}): Array<CssChild> => [
  rule('.stat', {
    font: font('regular', 'body'),
    fill: textColor,
    'font-variant-numeric': 'tabular-nums',
  }),
  rule('.stagger', { animation: 'fadeInAnimation 0.3s ease-in-out backwards' }),
  rule('.not_bold', { 'font-weight': CARD_STYLE.fontWeight.regular, opacity: 0.75 }),
  rule('.bold', { 'font-weight': CARD_STYLE.fontWeight.semibold }),
  rule('.icon', { fill: iconColor, opacity: 0.75, display: show_icons ? 'block' : 'none' }),
  atRule(
    '@keyframes growWidthAnimation',
    rule('from', { width: 0 }),
    rule('to', { width: '100%' }),
  ),
  rule('.lang-progress', {
    animation: 'growWidthAnimation 0.6s ease-in-out backwards',
    fill: HEAT_PAINT.line,
  }),
  rule('.progress-background', { fill: progBarBgColor }),
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
    range,
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
    title,
    border_radius,
    locale,
    disable_animations = false,
  } = options;

  const { lightColors, darkColors } = getLightDarkColors(options);

  // Typed against the exported list, so a stat drawn here cannot be missing from it.
  const shows = (stat: ShowStat): boolean => show.includes(stat);

  const t = localize(orgActivityCardLocales, locale);
  const formatCount = countFormatter(options);

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

  if (shows('discussions_started')) {
    STATS['discussions_started'] = {
      icon: icons.discussions_started,
      label: t.discussions(),
      value: discussionsOpened,
      id: 'discussions_started',
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
    throw CardError.because('org_no_stats', { card: 'organization activity' });
  }

  const width = card_width && !Number.isNaN(card_width) ? card_width : CARD_DEFAULT_WIDTH;

  const visible = new Map(visibleStats);
  const flowWording = {
    prs: (opened: string, done: string): FlowItem['value'] => t.prsFlow({ opened, merged: done }),
    issues: (opened: string, done: string): FlowItem['value'] =>
      t.issuesFlow({ opened, closed: done }),
  };
  const flowLabels = { prs: t.pullRequests(), issues: t.issues() };
  const paired = new Set<string>();
  const rows: Array<Row> = [];
  for (const [key, stat] of visibleStats) {
    const flow = FLOWS.find(([opened, done]) => key === opened || key === done);
    const opened = flow && visible.get(flow[0]);
    const done = flow && visible.get(flow[1]);
    if (!flow || !opened || !done) {
      rows.push({ stat });
    } else if (!paired.has(flow[2])) {
      paired.add(flow[2]);
      rows.push({
        flow: {
          icon: done.icon,
          label: flowLabels[flow[2]],
          value: flowWording[flow[2]](formatCount(opened.value), formatCount(done.value)),
          id: flow[2],
          progress: keepingUp(opened.value, done.value),
        },
      });
    }
  }

  const rowHeights = rows.map((row) => ('flow' in row ? CARD_STYLE.flowRow.height : LINE_HEIGHT));
  const lastRow = rows.at(-1);
  const lastInk =
    lastRow && 'flow' in lastRow
      ? CARD_STYLE.flowRow.barY + CARD_STYLE.bar.height
      : CARD_STYLE.statRowInk;
  const height =
    CARD_STYLE.padding.bodyOffsetY +
    rowHeights.slice(0, -1).reduce((sum, rowHeight) => sum + rowHeight, 0) +
    lastInk +
    CARD_STYLE.padding.bottom;

  // A value ends at the card's inner edge — or right after the widest label and its value,
  // on a card too narrow for that.
  const widestRow = Math.max(
    ...rows.map((row) => {
      if ('flow' in row) {
        return (
          measureText(`${row.flow.label}:`, CARD_STYLE.fontSize.body) +
          LABEL_VALUE_GAP +
          measureText(row.flow.value, CARD_STYLE.fontSize.body)
        );
      }
      return measureText(`${row.stat.label}:`, CARD_STYLE.fontSize.body);
    }),
  );
  const valueAnchorX = Math.round(
    Math.max(
      width - CARD_STYLE.padding.x - STAT_ROW_X,
      (show_icons ? LABEL_X_OFFSET : 0) + widestRow + LABEL_VALUE_GAP,
    ),
  );

  const statItems = rows.map((row, index) => {
    const item = 'flow' in row ? row.flow : row.stat;
    const text = createTextNode({
      icon: item.icon,
      label: item.label,
      value: item.value,
      id: item.id,
      index,
      showIcons: show_icons,
      valueAnchorX,
      bold: true,
      labelBold: false,
      formatValue: formatCount,
    });
    if (!('flow' in row)) {
      return text;
    }
    return el(
      'g',
      { 'data-testid': `${row.flow.id}-flow` },
      text,
      createProgressNode({
        x: STAT_ROW_X,
        y: CARD_STYLE.flowRow.barY,
        width: valueAnchorX,
        progress: row.flow.progress,
        delay: 120 + index * 40 + 300,
      }),
    );
  });

  // `role="img"` hides the inner text from assistive tech, so everything the card
  // shows has to be repeated in its description.
  const card = new Card({
    title: title ?? defaultTitleFor(t, name, { days, range }, width),
    titlePrefixIcon: CARD_ICON.orgActivity,
    width,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
    description: visibleStats.map(([, stat]) => `${stat.label}: ${String(stat.value)}`).join(', '),
    hideBorder: hide_border,
    hideTitle: hide_title,
    animations: !disable_animations,
    css: ({ textColor, iconColor, progBarBgColor }): Array<CssChild> =>
      getStyles({ textColor, iconColor, progBarBgColor, show_icons }),
  });

  return card.render(
    flexLayout({ items: statItems, gap: 0, sizes: rowHeights, direction: 'column' }),
  );
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
