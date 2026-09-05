import { Card } from '../common/Card.ts';
import { getLightDarkColors } from '../common/color.ts';
import { kFormatter } from '../common/fmt.ts';
import { I18n } from '../common/I18n.ts';
import { icons } from '../common/icons.ts';
import { buildSearchFilter, clampValue, parseEmojis } from '../common/ops.ts';
import {
  NUMBER_FORMATS,
  countWrappedLines,
  wrapTextMultiline,
  createLanguageNode,
  createTextNode,
  flexLayout,
  iconWithLabel,
  measureText,
  wrappedTextNode,
  wrappedTextStyles,
} from '../common/render.ts';
import type { RepositoryData } from '../fetchers/types.ts';
import type { Child, MarkupElement } from '../markup/index.ts';
import { el, rule } from '../markup/index.ts';
import { repoCardLocales } from '../translations.ts';

import type { CardOptions, CommonCardOptions } from './options.ts';

const ICON_SIZE = 16;
const CARD_DEFAULT_WIDTH = 400;
const X_OFFSET = 25;
const DESCRIPTION_FONT_SIZE = 13;
const DESCRIPTION_LINE_HEIGHT_PX = 16;
const DESCRIPTION_MAX_LINES = 3;

/** Stats the card draws only when `show` names them. */
const REPO_SHOW_STATS = [
  'prs_authored',
  'prs_commented',
  'prs_reviewed',
  'issues_authored',
  'issues_commented',
] as const;
type RepoShowStat = (typeof REPO_SHOW_STATS)[number];

interface RepoCardOptions extends CommonCardOptions {
  locale: string;
  show_owner: boolean;
  browser_rendering: boolean;
  description_lines_count: number;
  card_width_input: number;
  show: Array<string>;
  show_icons: boolean;
  number_format: string;
  text_bold: boolean;
  line_height: number | string;
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
  } = repo;
  const {
    hide_border = false,
    card_width_input,
    show_owner = false,
    browser_rendering = false,
    show = [],
    show_icons = true,
    number_format = 'short',
    text_bold = false,
    line_height = 22,
    username,
    theme = 'default_repocard',
    border_radius,
    locale,
    description_lines_count,
  } = options;

  const card_width =
    card_width_input && !Number.isNaN(card_width_input)
      ? card_width_input
      : show.length >= 2
        ? CARD_DEFAULT_WIDTH + 30
        : CARD_DEFAULT_WIDTH;

  const i18n = new I18n({
    locale,
    translations: repoCardLocales,
  });

  // Typed against the exported list, so a stat drawn here cannot be missing from it.
  const shows = (stat: RepoShowStat): boolean => show.includes(stat);

  const repoFilter = encodeURIComponent(buildSearchFilter([nameWithOwner], []));
  const encodedUsername = encodeURIComponent(username ?? '');
  const STATS: Record<string, RepoStatItem> = {};
  if (shows('prs_authored')) {
    STATS['prs_authored'] = {
      icon: icons.prs,
      label: i18n.t('repocard.prs-authored'),
      value: totalPRsAuthored,
      id: 'prs_authored',
      link: `https://github.com/search?q=${repoFilter}author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (shows('prs_commented')) {
    STATS['prs_commented'] = {
      icon: icons.comments,
      label: i18n.t('repocard.prs-commented'),
      value: totalPRsCommented,
      id: 'prs_commented',
      link: `https://github.com/search?q=${repoFilter}commenter%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (shows('prs_reviewed')) {
    STATS['prs_reviewed'] = {
      icon: icons.reviews,
      label: i18n.t('repocard.prs-reviewed'),
      value: totalPRsReviewed,
      id: 'prs_reviewed',
      link: `https://github.com/search?q=${repoFilter}reviewed-by%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (shows('issues_authored')) {
    STATS['issues_authored'] = {
      icon: icons.issues,
      label: i18n.t('repocard.issues-authored'),
      value: totalIssuesAuthored,
      id: 'issues_authored',
      link: `https://github.com/search?q=${repoFilter}author%3A${encodedUsername}&amp;type=issues`,
    };
  }
  if (shows('issues_commented')) {
    STATS['issues_commented'] = {
      icon: icons.discussions_started,
      label: i18n.t('repocard.issues-commented'),
      value: totalIssuesCommented,
      id: 'issues_commented',
      link: `https://github.com/search?q=${repoFilter}commenter%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=issues`,
    };
  }

  const statItems = Object.values(STATS).map((stat, index) =>
    // create the text nodes, and pass index so that we can calculate the line spacing
    createTextNode({
      icon: stat.icon,
      label: stat.label,
      value: stat.value ?? 0,
      id: stat.id,
      unitSymbol: stat.unitSymbol,
      index,
      showIcons: show_icons,
      shiftValuePos: 14.01,
      bold: text_bold,
      numberFormat: number_format,
      link: stat.link,
      labelXOffset: 23,
    }),
  );

  const extraLHeight = Number.parseInt(String(line_height), 10);
  const lineHeight = 10;
  const header = show_owner ? nameWithOwner : name;
  const langName = primaryLanguage?.name || 'Unspecified';
  const langColor = primaryLanguage?.color || '#333';
  const desc = parseEmojis(description || 'No description provided');
  const descriptionBoxWidth = card_width - 2 * X_OFFSET;

  let descriptionLinesCount: number;
  let descriptionSvg: Child;
  if (browser_rendering) {
    // The browser performs the actual text wrapping inside the foreignObject;
    // we only estimate the line count server-side so the SVG can reserve enough
    // height. The estimate uses measureText for font-aware widths instead of a
    // fixed character count.
    descriptionLinesCount = description_lines_count
      ? clampValue(description_lines_count, 1, DESCRIPTION_MAX_LINES)
      : countWrappedLines(desc, DESCRIPTION_FONT_SIZE, descriptionBoxWidth, DESCRIPTION_MAX_LINES);
    descriptionSvg = wrappedTextNode({
      text: desc,
      x: X_OFFSET,
      y: -3,
      width: descriptionBoxWidth,
      height: descriptionLinesCount * DESCRIPTION_LINE_HEIGHT_PX + 10, // 10px extra for "descenders" like g, j, q, p, y
      lineCount: descriptionLinesCount,
      className: 'description',
      testId: 'description-text',
    });
  } else {
    const descriptionMaxLines = description_lines_count
      ? clampValue(description_lines_count, 1, DESCRIPTION_MAX_LINES)
      : DESCRIPTION_MAX_LINES;
    const multiLineDescription = wrapTextMultiline(
      desc,
      descriptionBoxWidth,
      DESCRIPTION_FONT_SIZE,
      descriptionMaxLines,
    );
    descriptionLinesCount = description_lines_count
      ? clampValue(description_lines_count, 1, DESCRIPTION_MAX_LINES)
      : multiLineDescription.length;
    descriptionSvg = el(
      'text',
      { class: 'description', x: X_OFFSET, y: -5 },
      multiLineDescription.map((line) => el('tspan', { dy: '1.2em', x: X_OFFSET }, line)),
    );
  }

  const extraHeight =
    Object.keys(STATS).length > 0 ? -7 + (Math.ceil(statItems.length / 2) + 1) * extraLHeight : 0;
  const height =
    (descriptionLinesCount > 1 ? 120 : 110) + descriptionLinesCount * lineHeight + extraHeight;

  const { lightColors, darkColors } = getLightDarkColors({ ...options, theme });

  const svgLanguage = primaryLanguage ? createLanguageNode(langName, langColor) : undefined;

  const totalStars = kFormatter(stargazerCount);
  const totalForks = kFormatter(forkCount);
  const svgStars = iconWithLabel(icons.star, totalStars, 'stargazers', ICON_SIZE);
  const svgForks = iconWithLabel(icons.fork, totalForks, 'forkcount', ICON_SIZE);

  const starAndForkCount = flexLayout({
    items: [svgLanguage, svgStars, svgForks],
    sizes: [
      measureText(langName, 12),
      ICON_SIZE + measureText(`${totalStars}`, 12),
      ICON_SIZE + measureText(`${totalForks}`, 12),
    ],
    gap: 25,
  });

  const extraRows: Array<Child> = [];
  for (let i = 0; i < statItems.length; i += 2) {
    extraRows.push(
      flexLayout({
        items: statItems.slice(i, i + 2),
        gap: 210,
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
      flexLayout({ items: extraRows, gap: extraLHeight, direction: 'column' }),
    ),
  );

  const card = new Card({
    defaultTitle: header.length > 35 ? `${header.slice(0, 35)}...` : header,
    titlePrefixIcon: icons.contribs,
    width: card_width,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
  });

  card.disableAnimations();
  card.setHideBorder(hide_border);
  card.setHideTitle(false);
  card.setCSS({
    light: ({ textColor, iconColor }) => [
      rule('.description', {
        font: `400 ${DESCRIPTION_FONT_SIZE}px 'Segoe UI', Ubuntu, Sans-Serif`,
        fill: textColor,
        ...(browser_rendering ? wrappedTextStyles(textColor) : {}),
      }),
      rule('.gray', { font: "400 12px 'Segoe UI', Ubuntu, Sans-Serif", fill: textColor }),
      rule('.badge', { font: "600 11px 'Segoe UI', Ubuntu, Sans-Serif" }),
      rule('.badge rect', { opacity: 0.2, stroke: textColor }),
      rule('.badge text', { fill: textColor }),
      rule('.stat', { font: "400 12px 'Segoe UI', Ubuntu, Sans-Serif", fill: textColor }),
      rule('.stagger', {
        opacity: 0,
        animation: 'fadeInAnimation 0.3s ease-in-out forwards',
      }),
      rule('.not_bold', { 'font-weight': 400 }),
      rule('.bold', { 'font-weight': 700 }),
      rule('.icon', { fill: iconColor, display: 'block' }),
    ],
    dark: ({ textColor, iconColor }) => [
      rule('.description', {
        fill: textColor,
        ...(browser_rendering ? wrappedTextStyles(textColor) : {}),
      }),
      rule('.gray', { fill: textColor }),
      rule('.badge rect', { stroke: textColor }),
      rule('.badge text', { fill: textColor }),
      rule('.stat', { fill: textColor }),
      rule('.icon', { fill: iconColor }),
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
    desc: [`${desc}.`, primaryLanguage ? langName : '', extraStatLabels].filter(Boolean).join(', '),
  });

  return card.render([
    isTemplate
      ? getBadgeSVG(i18n.t('repocard.template'), card_width - CARD_DEFAULT_WIDTH)
      : isArchived
        ? getBadgeSVG(i18n.t('repocard.archived'), card_width - CARD_DEFAULT_WIDTH)
        : undefined,
    descriptionSvg,
    el('g', { transform: `translate(30, ${height - 75 - extraHeight})` }, starAndForkCount),
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
