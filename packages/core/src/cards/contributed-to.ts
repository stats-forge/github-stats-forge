import { Card } from '../common/Card.ts';
import { getLightDarkColors } from '../common/color.ts';
import { kFormatter } from '../common/fmt.ts';
import { icons } from '../common/icons.ts';
import { clampValue } from '../common/ops.ts';
import { createProgressNode, measureText } from '../common/render.ts';
import type { ContributedRepo, ContributedToData } from '../fetchers/types.ts';
import type { Child } from '../markup/index.ts';
import { atRule, cssComment, el, rule } from '../markup/index.ts';

import type { CardOptions, CommonCardOptions } from './options.ts';

const CARD_DEFAULT_WIDTH = 450;
const MIN_CARD_WIDTH = 340;
/** Padding the card keeps at its edges; matches `Card`'s own `paddingX`. */
const CARD_PADDING = 25;

const TITLE_FONT_SIZE = 18;
/** What `Card`'s title layout reserves for the prefix icon, so the title text starts past it. */
const TITLE_ICON_COLUMN = 25;
const NAME_FONT_SIZE = 13;
const FOOTER_FONT_SIZE = 11;

/** Room kept at the right edge for the contribution count. */
const COUNT_WIDTH = 46;
const BAR_WIDTH = 130;
const COLUMN_GAP = 12;

/** Baseline of the first row, measured from the top of the card body. */
const FIRST_ROW_Y = 10;
const ROW_HEIGHT = 38;
/** A row with no year marks under it needs only its own line. */
const ROW_HEIGHT_NO_YEARS = 24;
/** How far the year marks sit below their row's baseline. */
const YEAR_STRIP_Y = 8;
const YEAR_MARK_SIZE = 7;
const YEAR_MARK_GAP = 3;

/** Gap between the last row and the footer's own baseline. */
const FOOTER_GAP = 12;
/** Where `Card` puts the body while the title is shown; `setHideTitle` adjusts the height by the same 30. */
const BODY_OFFSET_Y = 55;
const BOTTOM_PADDING = 18;

interface ContributedToCardOptions extends CommonCardOptions {
  hide_title: boolean;
  card_width: number;
  custom_title: string;
  disable_animations: boolean;
  hide_years: boolean;
}

/**
 * The title, naming the account unless that makes it too wide for the card.
 *
 * A login is up to 39 characters, which at the title's size overruns the default width
 * by half again — so the plain wording is the fallback rather than a truncated login.
 *
 * @returns The default title, which `custom_title` still overrides.
 */
const defaultTitleFor = (login: string, contentWidth: number): string => {
  const named = `Repositories ${login} contributed to`;
  return measureText(named, TITLE_FONT_SIZE) <= contentWidth
    ? named
    : 'Repositories contributed to';
};

/**
 * Shortens a name to fit its column, ending it with an ellipsis when it does not.
 *
 * @returns The name as it is drawn.
 */
const truncateName = (name: string, maxWidth: number): string => {
  if (measureText(name, NAME_FONT_SIZE) <= maxWidth) {
    return name;
  }

  let trimmed = name;
  while (trimmed.length > 1 && measureText(`${trimmed}…`, NAME_FONT_SIZE) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
};

/**
 * The marks under a repository's name, one per contribution year of the account,
 * filled for the years that repository got a contribution.
 *
 * The step shrinks to fit, so a long-lived account keeps the strip inside its column
 * rather than running it under the bar.
 *
 * @returns The strip, positioned relative to its row's baseline.
 */
const createYearStrip = (
  repoYears: Array<number>,
  years: Array<number>,
  columnWidth: number,
): Child => {
  const contributed = new Set(repoYears);
  const step = Math.min(YEAR_MARK_SIZE + YEAR_MARK_GAP, Math.floor(columnWidth / years.length));
  const size = Math.max(step - YEAR_MARK_GAP, 3);

  return el(
    'g',
    { 'data-testid': 'year-strip', transform: `translate(0, ${YEAR_STRIP_Y})` },
    years.map((year, index) =>
      el('rect', {
        'data-testid': contributed.has(year) ? 'year-on' : 'year-off',
        class: contributed.has(year) ? 'year-on' : 'year-off',
        x: index * step,
        y: 0,
        width: size,
        height: size,
        rx: 1,
        ry: 1,
      }),
    ),
  );
};

/**
 * One repository: its name, a bar for its share of the top repository's contributions,
 * and the count itself.
 *
 * @returns The row, positioned by its own transform.
 */
const createRepoRow = ({
  repo,
  index,
  maxContributions,
  years,
  nameWidth,
  contentWidth,
  rowHeight,
}: {
  repo: ContributedRepo;
  index: number;
  maxContributions: number;
  /** Empty when the year marks are hidden. */
  years: Array<number>;
  nameWidth: number;
  contentWidth: number;
  rowHeight: number;
}): Child =>
  el(
    'g',
    {
      class: 'stagger',
      style: `animation-delay: ${450 + index * 150}ms`,
      transform: `translate(0, ${FIRST_ROW_Y + index * rowHeight})`,
    },
    el(
      'text',
      { class: 'repo-name', 'data-testid': 'repo-name', x: 0, y: 0 },
      truncateName(repo.nameWithOwner, nameWidth),
    ),
    createProgressNode({
      x: nameWidth + COLUMN_GAP,
      y: -9,
      width: BAR_WIDTH,
      progress: (repo.contributions / maxContributions) * 100,
      delay: 450 + index * 150,
    }),
    el(
      'text',
      {
        class: 'count',
        'data-testid': 'repo-contributions',
        x: contentWidth,
        y: 0,
        'text-anchor': 'end',
      },
      kFormatter(repo.contributions),
    ),
    years.length > 0 && createYearStrip(repo.years, years, nameWidth),
  );

/**
 * The line under the rows: how much of the walk the card is showing, and over what span.
 *
 * Never dropped, because the card shows a slice of the repositories
 * and a rank means nothing without the total it was taken from.
 *
 * @returns The footer text.
 */
const footerText = ({
  shown,
  totalRepos,
  years,
}: {
  shown: number;
  totalRepos: number;
  /** Empty when the year marks are hidden, which is what puts the span on the card. */
  years: Array<number>;
}): string => {
  const repoWord = totalRepos === 1 ? 'repository' : 'repositories';
  const parts = [
    shown < totalRepos ? `top ${shown} of ${totalRepos} ${repoWord}` : `${totalRepos} ${repoWord}`,
  ];

  const [firstYear] = years;
  const lastYear = years.at(-1);
  if (firstYear !== undefined && lastYear !== undefined) {
    parts.push(firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`);
  }

  return parts.join(' · ');
};

/**
 * Renders the repositories a user contributed to, ranked by contributions.
 *
 * @returns Contributed-to card SVG string.
 */
const renderContributedToCard = (
  data: ContributedToData,
  options: CardOptions<ContributedToCardOptions> = {},
): string => {
  const {
    hide_title = false,
    hide_border = false,
    card_width,
    custom_title,
    disable_animations = false,
    hide_years = false,
    border_radius,
    theme = 'default',
  } = options;

  const { login, repos, totalRepos } = data;
  const years = hide_years ? [] : data.years;

  const width =
    card_width && !Number.isNaN(card_width)
      ? clampValue(card_width, MIN_CARD_WIDTH, Number.MAX_SAFE_INTEGER)
      : CARD_DEFAULT_WIDTH;
  const contentWidth = width - 2 * CARD_PADDING;
  const nameWidth = contentWidth - COUNT_WIDTH - BAR_WIDTH - 2 * COLUMN_GAP;

  const rowHeight = years.length > 0 ? ROW_HEIGHT : ROW_HEIGHT_NO_YEARS;
  // the count is a share of the busiest repository, so the first bar is always full
  const maxContributions = Math.max(...repos.map((repo) => repo.contributions), 1);

  const rows = repos.map((repo, index) =>
    createRepoRow({
      repo,
      index,
      maxContributions,
      years,
      nameWidth,
      contentWidth,
      rowHeight,
    }),
  );

  const footer = footerText({ shown: repos.length, totalRepos, years });
  const footerY = FIRST_ROW_Y + Math.max(repos.length, 1) * rowHeight + FOOTER_GAP;
  const height = BODY_OFFSET_Y + footerY + BOTTOM_PADDING;

  const { lightColors, darkColors } = getLightDarkColors({ ...options, theme });

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: defaultTitleFor(login, contentWidth - TITLE_ICON_COLUMN),
    titlePrefixIcon: icons.contribs,
    width,
    height,
    border_radius,
    colors: { light: lightColors, dark: darkColors },
  });

  if (disable_animations) {
    card.disableAnimations();
  }

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  card.setCSS({
    light: ({ textColor, titleColor, iconColor, progBarBgColor }) => [
      atRule(
        '@keyframes growWidthAnimation',
        rule('from', { width: 0 }),
        rule('to', { width: '100%' }),
      ),
      rule('.repo-name', {
        font: `400 ${NAME_FONT_SIZE}px 'Segoe UI', Ubuntu, Sans-Serif`,
        fill: textColor,
      }),
      rule('.count', {
        font: `600 ${NAME_FONT_SIZE}px 'Segoe UI', Ubuntu, Sans-Serif`,
        fill: textColor,
        'font-variant-numeric': 'tabular-nums',
      }),
      rule('.footer', {
        font: `400 ${FOOTER_FONT_SIZE}px 'Segoe UI', Ubuntu, Sans-Serif`,
        fill: textColor,
        opacity: 0.7,
      }),
      atRule(
        '@supports(-moz-appearance: auto)',
        cssComment('Selector detects Firefox'),
        rule('.repo-name', { 'font-size': '12px' }),
        rule('.count', { 'font-size': '12px' }),
      ),
      rule('.year-on', { fill: titleColor }),
      // a year with no contribution reads off the text color, not `progBarBgColor`:
      // on a dark theme that color is a light grey, and the empty marks came out looking filled
      rule('.year-off', { fill: textColor, opacity: 0.25 }),
      rule('.progress-background', { fill: progBarBgColor }),
      rule('.lang-progress', {
        fill: titleColor,
        animation: 'growWidthAnimation 0.6s ease-in-out forwards',
      }),
      rule('.stagger', { opacity: 0, animation: 'fadeInAnimation 0.3s ease-in-out forwards' }),
      rule('.icon', { fill: iconColor, display: 'block' }),
    ],
    dark: ({ textColor, titleColor, iconColor, progBarBgColor }) => [
      rule('.repo-name', { fill: textColor }),
      rule('.count', { fill: textColor }),
      rule('.footer', { fill: textColor }),
      rule('.year-on', { fill: titleColor }),
      // a year with no contribution reads off the text color, not `progBarBgColor`:
      // on a dark theme that color is a light grey, and the empty marks came out looking filled
      rule('.year-off', { fill: textColor, opacity: 0.25 }),
      rule('.progress-background', { fill: progBarBgColor }),
      rule('.lang-progress', { fill: titleColor }),
      rule('.icon', { fill: iconColor }),
    ],
  });

  // `role="img"` hides the inner text from assistive tech, so everything the card
  // shows has to be repeated here — the year marks included, since they carry
  // information no other element on the card does.
  card.setAccessibilityLabel({
    title: card.title,
    desc: [
      ...repos.map((repo) => {
        const span = hide_years ? '' : ` in ${repo.years.join(', ')}`;
        return `${repo.nameWithOwner}: ${repo.contributions} contributions${span}`;
      }),
      footer,
    ].join('; '),
  });

  return card.render(
    el(
      'g',
      { 'data-testid': 'contributed-to-body', transform: `translate(${CARD_PADDING}, 0)` },
      repos.length === 0
        ? el(
            'text',
            { class: 'repo-name', 'data-testid': 'no-repos', x: 0, y: FIRST_ROW_Y },
            'No contributions found',
          )
        : rows,
      el('text', { class: 'footer', 'data-testid': 'footer', x: 0, y: footerY }, footer),
    ),
  );
};

export { renderContributedToCard, MIN_CARD_WIDTH };
