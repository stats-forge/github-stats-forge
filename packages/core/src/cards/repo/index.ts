import { CARD_ICON, CARD_STYLE, font } from '../../common/brand.ts';
import { Card } from '../../common/Card.ts';
import { getLightDarkColors } from '../../common/color.ts';
import { icons } from '../../common/icons.ts';
import { localize } from '../../common/localize.ts';
import { buildSearchFilter, clampValue, parseEmojis } from '../../common/ops.ts';
import {
  createLanguageNode,
  createTextNode,
  flexLayout,
  formatCount,
  iconWithLabel,
  NUMBER_FORMATS,
} from '../../common/render.ts';
import { measureText, wrapTextMultiline } from '../../common/text.ts';
import type { RepositoryData } from '../../fetchers/types.ts';
import type { Child, MarkupElement } from '../../markup/index.ts';
import { el, rule } from '../../markup/index.ts';
import type { CardOptions, CommonCardOptions } from '../options.ts';

import { repoCardLocales } from './locales.ts';

const ICON_SIZE = 16;
const CARD_DEFAULT_WIDTH = CARD_STYLE.width.standard;
const X_OFFSET = 25;
const DESCRIPTION_FONT_SIZE = CARD_STYLE.fontSize.meta;
const DESCRIPTION_MAX_LINES = 3;
/** Where a stat row starts: the stats group's `-3` plus `createTextNode`'s own `25`. */
const STAT_ROW_X = 22;
const STAT_LABEL_X = 23;
const STAT_COLUMN_GAP = 20;
const LABEL_VALUE_GAP = 10;
/** `measureText` reads Segoe UI; the stack's other fonts run wider. */
const INK_SCALE = 1.05;

/** @returns The width of the widest of `texts`, as a row draws them. */
const widest = (texts: Array<string>): number =>
  Math.max(...texts.map((text) => measureText(text, CARD_STYLE.fontSize.small))) * INK_SCALE;

/** What the card draws only when `show` names it: the topics, and a row per stat. */
const REPO_SHOW_STATS = [
  'prs_opened',
  'prs_commented',
  'prs_reviewed',
  'issues_opened',
  'issues_commented',
  'topics',
] as const;
type RepoShowStat = (typeof REPO_SHOW_STATS)[number];

/** The space between stat rows, which the card's height is measured on. */
const EXTRA_LINE_HEIGHT = 22;

interface RepoCardOptions extends CommonCardOptions {
  locale: string;
  disable_animations: boolean;
  show_owner: boolean;
  description_lines_count: number;
  card_width_input: number;
  show: Array<string>;
  show_icons: boolean;
  number_format: string;
  number_precision: number;
  username: string;
}

interface RepoStatItem {
  icon: Child;
  label: string;
  value: number | undefined;
  id: string;
  link: string;
  unitSymbol?: string;
}

/**
 * Retrieves the repository description and wraps it to fit the card width.
 *
 * @returns Wrapped repo description SVG object.
 */
const getBadgeSVG = (label: string, xOffset = 0): MarkupElement => {
  if (!Number.isFinite(xOffset)) {
    throw new TypeError(`Invalid xOffset: "${xOffset}"`);
  }

  return el(
    'g',
    { 'data-testid': 'badge', class: 'badge', transform: `translate(${320 + xOffset}, -18)` },
    el('rect', { 'stroke-width': 1, width: 70, height: 20, x: -12, y: -14, ry: 10, rx: 10 }),
    el(
      'text',
      {
        x: 23,
        y: -5,
        'alignment-baseline': 'central',
        'dominant-baseline': 'central',
        'text-anchor': 'middle',
      },
      label,
    ),
  );
};

/**
 * Draws as many of the topics as fit in one row of `width`, in GitHub's order.
 *
 * @returns The row, and the topics it drew.
 */
const getTopicsRow = (
  topics: Array<string>,
  width: number,
): { row: MarkupElement; drawn: Array<string> } => {
  const { height, paddingX, gap } = CARD_STYLE.topic;
  const pills: Array<MarkupElement> = [];
  const drawn: Array<string> = [];
  let x = 0;
  for (const topic of topics) {
    const pillWidth =
      Math.ceil(measureText(topic, CARD_STYLE.fontSize.micro) * INK_SCALE) + 2 * paddingX;
    if (x + pillWidth > width) {
      break;
    }
    pills.push(
      el(
        'g',
        { 'data-testid': 'topic', transform: `translate(${x}, 0)` },
        el('rect', { width: pillWidth, height, rx: height / 2, ry: height / 2 }),
        el(
          'text',
          {
            x: pillWidth / 2,
            y: height / 2,
            'dominant-baseline': 'central',
            'text-anchor': 'middle',
          },
          topic,
        ),
      ),
    );
    drawn.push(topic);
    x += pillWidth + gap;
  }

  return { row: el('g', { class: 'topic' }, pills), drawn };
};

/**
 * Renders repository card details.
 *
 * @returns Repository card SVG object.
 */
const renderCard = (repo: RepositoryData, options: CardOptions<RepoCardOptions> = {}): string => {
  const {
    name,
    nameWithOwner,
    description,
    primaryLanguage,
    isArchived,
    isTemplate,
    stargazerCount,
    forkCount,
    totalPRsAuthored,
    totalPRsCommented,
    totalPRsReviewed,
    totalIssuesAuthored,
    totalIssuesCommented,
    topics = [],
  } = repo;
  const {
    hide_border = false,
    card_width_input,
    show_owner = false,
    show = [],
    show_icons = true,
    number_format = 'short',
    number_precision,
    username,
    theme = 'default_repocard',
    border_radius,
    locale,
    description_lines_count,
    disable_animations = false,
  } = options;

  const t = localize(repoCardLocales, locale);

  // Typed against the exported list, so a stat drawn here cannot be missing from it.
  const shows = (stat: RepoShowStat): boolean => show.includes(stat);

  const repoFilter = encodeURIComponent(buildSearchFilter([nameWithOwner]));
  const encodedUsername = encodeURIComponent(username ?? '');
  const STATS: Record<string, RepoStatItem> = {};
  if (shows('prs_opened')) {
    STATS['prs_opened'] = {
      icon: icons.prs,
      label: t.prsOpened(),
      value: totalPRsAuthored,
      id: 'prs_opened',
      link: `https://github.com/search?q=${repoFilter}author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (shows('prs_commented')) {
    STATS['prs_commented'] = {
      icon: icons.comments,
      label: t.prsCommented(),
      value: totalPRsCommented,
      id: 'prs_commented',
      link: `https://github.com/search?q=${repoFilter}commenter%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (shows('prs_reviewed')) {
    STATS['prs_reviewed'] = {
      icon: icons.reviews,
      label: t.prsReviewed(),
      value: totalPRsReviewed,
      id: 'prs_reviewed',
      link: `https://github.com/search?q=${repoFilter}reviewed-by%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (shows('issues_opened')) {
    STATS['issues_opened'] = {
      icon: icons.issues,
      label: t.issuesOpened(),
      value: totalIssuesAuthored,
      id: 'issues_opened',
      link: `https://github.com/search?q=${repoFilter}author%3A${encodedUsername}&amp;type=issues`,
    };
  }
  if (shows('issues_commented')) {
    STATS['issues_commented'] = {
      icon: icons.discussions_started,
      label: t.issuesCommented(),
      value: totalIssuesCommented,
      id: 'issues_commented',
      link: `https://github.com/search?q=${repoFilter}commenter%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=issues`,
    };
  }

  // Stats fill the rows left to right, so an even index is the first column.
  const statList = Object.values(STATS);
  const columns = [0, 1]
    .map((column) => statList.filter((_, index) => index % 2 === column))
    .filter((column) => column.length > 0);
  const formatValue = (value: number): string =>
    formatCount(value, number_format, number_precision);
  // Each column's values end after its widest label and widest value, so neither can reach the other.
  const [firstColumnWidth = 0, secondColumnWidth = 0] = columns.map(
    (column) =>
      (show_icons ? STAT_LABEL_X : 0) +
      widest(column.map((stat) => `${stat.label}:`)) +
      LABEL_VALUE_GAP +
      widest(column.map((stat) => formatValue(stat.value ?? 0))),
  );

  const widthInput = card_width_input && !Number.isNaN(card_width_input) ? card_width_input : 0;
  const defaultWidth = columns.length > 1 ? CARD_STYLE.width.wide : CARD_DEFAULT_WIDTH;
  const statsArea = (widthInput || defaultWidth) - STAT_ROW_X - X_OFFSET;
  const secondColumnX = Math.ceil(
    Math.max((statsArea + STAT_COLUMN_GAP) / 2, firstColumnWidth + STAT_COLUMN_GAP),
  );
  const statsWidth = columns.length > 1 ? secondColumnX + secondColumnWidth : firstColumnWidth;

  // The default grows rather than overlap; a width asked for is kept, and the stats overflow it.
  const card_width =
    widthInput || Math.max(defaultWidth, Math.ceil(STAT_ROW_X + statsWidth + X_OFFSET));
  const valueAnchors = [
    secondColumnX - STAT_COLUMN_GAP,
    Math.ceil(Math.max(card_width - STAT_ROW_X - X_OFFSET - secondColumnX, secondColumnWidth)),
  ];

  const statItems = statList.map((stat, index) =>
    // create the text nodes, and pass index so that we can calculate the line spacing
    createTextNode({
      icon: stat.icon,
      label: stat.label,
      value: stat.value ?? 0,
      id: stat.id,
      unitSymbol: stat.unitSymbol,
      index,
      showIcons: show_icons,
      shiftValuePos: 0,
      valueAnchorX: valueAnchors[index % 2],
      bold: false,
      numberFormat: number_format,
      numberPrecision: number_precision,
      link: stat.link,
      labelXOffset: STAT_LABEL_X,
    }),
  );

  const lineHeight = 10;
  const header = show_owner ? nameWithOwner : name;
  const langName = primaryLanguage?.name || t.unspecifiedLanguage();
  const langColor = primaryLanguage?.color || '#333';
  const desc = parseEmojis(description || t.noDescription());
  const descriptionBoxWidth = card_width - 2 * X_OFFSET;

  const descriptionMaxLines = description_lines_count
    ? clampValue(description_lines_count, 1, DESCRIPTION_MAX_LINES)
    : DESCRIPTION_MAX_LINES;
  const multiLineDescription = wrapTextMultiline(
    desc,
    descriptionBoxWidth,
    DESCRIPTION_FONT_SIZE,
    descriptionMaxLines,
  );
  const descriptionLinesCount = description_lines_count
    ? clampValue(description_lines_count, 1, DESCRIPTION_MAX_LINES)
    : multiLineDescription.length;
  const { row: topicsRow, drawn: drawnTopics } = getTopicsRow(
    shows('topics') ? topics : [],
    descriptionBoxWidth,
  );
  const topicsHeight = drawnTopics.length > 0 ? CARD_STYLE.topic.rowHeight : 0;

  const descriptionSvg = el(
    'text',
    { class: 'description', x: X_OFFSET, y: -5 },
    multiLineDescription.map((line) => el('tspan', { dy: '1.2em', x: X_OFFSET }, line)),
  );

  const extraHeight =
    Object.keys(STATS).length > 0
      ? -7 + (Math.ceil(statItems.length / 2) + 1) * EXTRA_LINE_HEIGHT
      : 0;
  const height =
    (descriptionLinesCount > 1 ? 120 : 110) +
    descriptionLinesCount * lineHeight +
    topicsHeight +
    extraHeight;
  const languageRowY = height - 75 - extraHeight;

  const { lightColors, darkColors } = getLightDarkColors({ ...options, theme });

  const svgLanguage = primaryLanguage ? createLanguageNode(langName, langColor) : undefined;

  // a zero stays a number, which is what `iconWithLabel` leaves out
  const totalStars =
    stargazerCount > 0 ? formatCount(stargazerCount, number_format, number_precision) : 0;
  const totalForks = forkCount > 0 ? formatCount(forkCount, number_format, number_precision) : 0;
  const svgStars = iconWithLabel(icons.star, totalStars, 'stargazers', ICON_SIZE);
  const svgForks = iconWithLabel(icons.fork, totalForks, 'forkcount', ICON_SIZE);

  const starAndForkCount = flexLayout({
    items: [svgLanguage, svgStars, svgForks],
    sizes: [
      measureText(langName, 12),
      ICON_SIZE + measureText(String(totalStars), 12),
      ICON_SIZE + measureText(String(totalForks), 12),
    ],
    gap: 25,
  });

  const extraRows: Array<Child> = [];
  for (let i = 0; i < statItems.length; i += 2) {
    extraRows.push(
      flexLayout({
        items: statItems.slice(i, i + 2),
        gap: secondColumnX,
        direction: 'row',
      }),
    );
  }
  const extraItems = el(
    'svg',
    { x: 0, y: 0 },
    el(
      'g',
      { transform: `translate(-3, ${height - 52 - extraHeight})` },
      flexLayout({ items: extraRows, gap: EXTRA_LINE_HEIGHT, direction: 'column' }),
    ),
  );

  const card = new Card({
    defaultTitle: header.length > 35 ? `${header.slice(0, 35)}...` : header,
    titlePrefixIcon: CARD_ICON.repo,
    width: card_width,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
  });

  if (disable_animations) {
    card.disableAnimations();
  }
  card.setHideBorder(hide_border);
  card.setHideTitle(false);
  card.setCSS({
    light: ({ textColor, titleColor, iconColor }) => [
      rule('.description', {
        font: font('regular', 'meta'),
        fill: textColor,
      }),
      rule('.gray', { font: font('regular', 'small'), fill: textColor }),
      rule('.badge', { font: font('semibold', 'micro') }),
      rule('.badge rect', { opacity: 0.2, stroke: textColor }),
      rule('.badge text', { fill: textColor }),
      rule('.stat', { font: font('regular', 'small'), fill: textColor }),
      rule('.stagger', {
        opacity: 0,
        animation: 'fadeInAnimation 0.3s ease-in-out forwards',
      }),
      rule('.not_bold', { 'font-weight': CARD_STYLE.fontWeight.regular }),
      rule('.bold', { 'font-weight': CARD_STYLE.fontWeight.semibold }),
      rule('.icon', { fill: iconColor, display: 'block' }),
      rule('.topic rect', { fill: titleColor, opacity: CARD_STYLE.topic.opacity }),
      rule('.topic text', { font: font('regular', 'micro'), fill: titleColor }),
    ],
    dark: ({ textColor, titleColor, iconColor }) => [
      rule('.description', {
        fill: textColor,
      }),
      rule('.gray', { fill: textColor }),
      rule('.badge rect', { stroke: textColor }),
      rule('.badge text', { fill: textColor }),
      rule('.stat', { fill: textColor }),
      rule('.icon', { fill: iconColor }),
      rule('.topic rect', { fill: titleColor }),
      rule('.topic text', { fill: titleColor }),
    ],
  });

  const extraStatLabels = Object.values(STATS)
    .map((stat) => `${stat.label}: ${stat.value ?? 0}`)
    .join(', ');

  // `role="img"` hides the inner text from assistive tech, so everything the card
  // shows has to be repeated here.
  // Only translated or language-neutral text: the card honours `locale`, and there is no
  // translated vocabulary for "stars" or "forks", so those counts stay out rather than
  // announce themselves in English over a card rendered in another language.
  card.setAccessibilityLabel({
    title: card.title,
    desc: [`${desc}.`, primaryLanguage ? langName : '', ...drawnTopics, extraStatLabels]
      .filter(Boolean)
      .join(', '),
  });

  let badge: Child;
  if (isTemplate) {
    badge = getBadgeSVG(t.template(), card_width - CARD_DEFAULT_WIDTH);
  } else if (isArchived) {
    badge = getBadgeSVG(t.archived(), card_width - CARD_DEFAULT_WIDTH);
  }

  return card.render([
    badge,
    descriptionSvg,
    // the row sits in the room it added, above the language row
    drawnTopics.length > 0
      ? el(
          'g',
          {
            transform: `translate(${X_OFFSET}, ${languageRowY - CARD_STYLE.topic.rowHeight - CARD_STYLE.topic.height})`,
          },
          topicsRow,
        )
      : undefined,
    el('g', { transform: `translate(30, ${languageRowY})` }, starAndForkCount),
    extraItems,
  ]);
};

/**
 * The card, and the values each of its options accepts, keyed by the option's own name.
 * They ride on the renderer so a list cannot be found without what draws it;
 * the api handler forwards them onto its own export, which is what a UI reads.
 */
const renderRepoCard = Object.assign(renderCard, {
  OPTIONS: {
    show: REPO_SHOW_STATS,
    number_format: NUMBER_FORMATS,
  },
});

export { renderRepoCard };
