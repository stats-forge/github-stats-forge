import { CARD_ICON, CARD_WIDTH, FONT_SIZE, FONT_WEIGHT, font } from '../../common/brand.ts';
import { Card } from '../../common/Card.ts';
import { getLightDarkColors } from '../../common/color.ts';
import type { CardColors } from '../../common/color.ts';
import { CardError } from '../../common/error.ts';
import { kFormatter } from '../../common/fmt.ts';
import { icons } from '../../common/icons.ts';
import { localize } from '../../common/localize.ts';
import { parseEmojis } from '../../common/ops.ts';
import {
  NUMBER_FORMATS,
  createTextNode,
  flexLayout,
  measureText,
  wrapTextMultiline,
} from '../../common/render.ts';
import type { OrganizationData } from '../../fetchers/types.ts';
import type { Child, CssChild } from '../../markup/index.ts';
import { el, rule } from '../../markup/index.ts';
import type { CardOptions, CommonCardOptions } from '../options.ts';

import { orgCardLocales } from './locales.ts';

const CARD_DEFAULT_WIDTH = CARD_WIDTH.standard;
/** Padding the card keeps at its edges; matches `Card`'s own `paddingX`. */
const CARD_PADDING_X = 25;
/** How far a stat row is translated into the card; see `createTextNode`. */
const STAT_ROW_X = 25;
/** `createTextNode`'s own label offset, which it applies only when icons are shown. */
const LABEL_X_OFFSET = 25;
/** Smallest gap kept between the longest label and its value. */
const LABEL_VALUE_GAP = 16;
const DESCRIPTION_FONT_SIZE = FONT_SIZE.meta;
const DESCRIPTION_LINE_HEIGHT_PX = 16;
const DESCRIPTION_MAX_LINES = 2;
/** Air between the description and the first stat row. */
const DESCRIPTION_GAP = 8;

/** Stats the card draws only when `show` names them. */
const SHOW_STATS = ['releases', 'commits', 'members', 'top_language', 'created'] as const;
type ShowStat = (typeof SHOW_STATS)[number];

/** Stats the card always draws, and so the ones `hide` has anything to remove. */
const HIDE_STATS = ['repos', 'stars', 'forks', 'watchers', 'open_issues', 'open_prs'] as const;
type HideStat = (typeof HIDE_STATS)[number];

type StatId = HideStat | ShowStat;

interface OrgCardOptions extends CommonCardOptions {
  locale: string;
  hide: Array<string>;
  show: Array<string>;
  show_icons: boolean;
  hide_title: boolean;
  hide_description: boolean;
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
  value: number | string;
  id: string;
}

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
  rule('.description', { font: font('regular', 'meta'), fill: textColor, opacity: 0.9 }),
  rule('.stagger', { opacity: 0, animation: 'fadeInAnimation 0.3s ease-in-out forwards' }),
  rule('.not_bold', { 'font-weight': FONT_WEIGHT.regular, opacity: 0.75 }),
  rule('.bold', { 'font-weight': FONT_WEIGHT.semibold }),
  rule('.icon', { fill: iconColor, opacity: 0.75, display: show_icons ? 'block' : 'none' }),
];

/**
 * Renders the organization card.
 *
 * @returns The organization card SVG object.
 */
const renderCard = (
  organization: OrganizationData,
  options: CardOptions<OrgCardOptions> = {},
): string => {
  const {
    name,
    description,
    createdAt,
    publicRepos,
    totalStars,
    totalForks,
    totalWatchers,
    openIssues,
    openPRs,
    totalReleases,
    totalCommits,
    publicMembers,
    topLanguage,
    truncated,
  } = organization;
  const {
    hide = [],
    show = [],
    show_icons = true,
    hide_title = false,
    hide_border = false,
    hide_description = false,
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

  const apostrophe = /s$/i.test(name.trim()) ? '' : 's';
  const t = localize(orgCardLocales, locale);

  /**
   * A total the walk may have stopped short of reads as a lower bound.
   *
   * @returns The value, as the row draws it.
   */
  const total = (value: number): number | string =>
    truncated
      ? `${number_format.toLowerCase() === 'long' ? String(value) : kFormatter(value)}+`
      : value;

  const STATS: Partial<Record<StatId, StatItem>> = {
    repos: {
      icon: icons.repo,
      label: t.repos(),
      value: publicRepos,
      id: 'repos',
    },
    stars: {
      icon: icons.star,
      label: t.stars(),
      value: total(totalStars),
      id: 'stars',
    },
    forks: {
      icon: icons.fork,
      label: t.forks(),
      value: total(totalForks),
      id: 'forks',
    },
    watchers: {
      icon: icons.watchers,
      label: t.watchers(),
      value: total(totalWatchers),
      id: 'watchers',
    },
    open_issues: {
      icon: icons.issues,
      label: t.openIssues(),
      value: total(openIssues),
      id: 'open_issues',
    },
    open_prs: {
      icon: icons.prs,
      label: t.openPrs(),
      value: total(openPRs),
      id: 'open_prs',
    },
  };

  if (shows('releases')) {
    STATS['releases'] = {
      icon: icons.tag,
      label: t.releases(),
      value: total(totalReleases),
      id: 'releases',
    };
  }
  if (shows('commits')) {
    STATS['commits'] = {
      icon: icons.commits,
      label: t.commits(),
      value: total(totalCommits),
      id: 'commits',
    };
  }

  if (shows('members')) {
    STATS['members'] = {
      icon: icons.people,
      label: t.members(),
      value: publicMembers,
      id: 'members',
    };
  }
  if (shows('top_language')) {
    STATS['top_language'] = {
      icon: icons.code,
      label: t.topLanguage(),
      value: topLanguage?.name ?? t.unspecifiedLanguage(),
      id: 'top_language',
    };
  }
  if (shows('created')) {
    const year = new Date(createdAt).getUTCFullYear();
    STATS['created'] = {
      icon: icons.calendar,
      label: t.created(),
      value: Number.isNaN(year) ? '—' : String(year),
      id: 'created',
    };
  }

  const visibleStats = Object.entries(STATS).filter(([key]) => !hide.includes(key));

  if (visibleStats.length === 0) {
    throw new CardError('Could not render organization card.', {
      code: 'invalid_param',
      secondaryMessage: 'At least one stat is required.',
    });
  }

  const width = card_width && !Number.isNaN(card_width) ? card_width : CARD_DEFAULT_WIDTH;

  const desc = hide_description ? '' : parseEmojis(description || t.noDescription());
  const descriptionLines = desc
    ? wrapTextMultiline(
        desc,
        width - 2 * CARD_PADDING_X,
        DESCRIPTION_FONT_SIZE,
        DESCRIPTION_MAX_LINES,
      )
    : [];
  const statsTop =
    descriptionLines.length > 0
      ? descriptionLines.length * DESCRIPTION_LINE_HEIGHT_PX + DESCRIPTION_GAP
      : 0;

  const height = 45 + (visibleStats.length + 1) * lheight + statsTop;

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
    defaultTitle: t.title({ name, apostrophe }),
    titlePrefixIcon: CARD_ICON.organization,
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
    desc: [
      desc && `${desc}.`,
      visibleStats.map(([, stat]) => `${stat.label}: ${String(stat.value)}`).join(', '),
    ]
      .filter(Boolean)
      .join(' '),
  });

  const descriptionSvg =
    descriptionLines.length > 0 &&
    el(
      'text',
      { class: 'description', 'data-testid': 'description', x: CARD_PADDING_X, y: -5 },
      descriptionLines.map((line) => el('tspan', { dy: '1.2em', x: CARD_PADDING_X }, line)),
    );

  return card.render([
    descriptionSvg,
    el(
      'g',
      { transform: `translate(0, ${statsTop})` },
      flexLayout({ items: statItems, gap: lheight, direction: 'column' }),
    ),
  ]);
};

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * They ride on the renderer so a list cannot be found without what draws it;
 * the api handler forwards them onto its own export, which is what a UI reads.
 */
const renderOrganizationCard = Object.assign(renderCard, {
  OPTIONS: {
    show: SHOW_STATS,
    hide: HIDE_STATS,
    number_format: NUMBER_FORMATS,
  },
});

export { renderOrganizationCard };
