/**
 * @file What each card accepts, in the order the prompts walk it.
 *
 * The core schemas validate these params;
 * this catalog is what makes them navigable, so it carries the prose and the choices a schema has no room for.
 */

import {
  contributedTo,
  gist,
  org,
  pin,
  stats,
  themes,
  topLangs,
  wakatime,
} from '@stats-forge/github-stats-forge-core/api';
import type { ApiResult, CardConfig } from '@stats-forge/github-stats-forge-core/api';

/** How a param is asked for, and how the answer becomes a query string value. */
export type OptionKind = 'text' | 'boolean' | 'number' | 'integer' | 'list' | 'choice';

/**
 * Which kinds are numeric, and how finely each moves.
 * The split follows core's own: a param it reads with `looseIntParam` is an `integer`,
 * one it reads with `numberParam` a `number`.
 */
const NUMERIC_STEP: Partial<Record<OptionKind, 1 | 'any'>> = { integer: 1, number: 'any' };

/**
 * Read by both forms over these options, so neither can decide on its own what is numeric.
 * The vocabulary is `<input type="number">`'s, which `@inquirer/number` happens to share.
 *
 * @returns The step the option moves in, or `undefined` when it is not a number at all.
 */
export const numericStep = (kind: OptionKind): 1 | 'any' | undefined => NUMERIC_STEP[kind];

/** One param of one card. */
export interface CardField {
  /** Query param the answer is written to. */
  name: string;
  /** What the prompt asks. */
  label: string;
  kind: OptionKind;
  /** The accepted values, for `choice` and for a `list` whose values are a closed set. */
  choices?: ReadonlyArray<string>;
  /** Shown under the prompt, for anything the label cannot say. */
  hint?: string;
}

/** Which section of the option menu a param sits in. */
export type OptionGroup = 'data' | 'display' | 'text' | 'colors';

/**
 * The menu's sections, in the order it shows them.
 * A section no option sits under is dropped, so a card that counts nothing has none.
 */
export const OPTION_GROUPS: ReadonlyArray<{ group: OptionGroup; label: string }> = [
  { group: 'data', label: 'What it counts' },
  { group: 'display', label: 'What it shows' },
  { group: 'text', label: 'Text and size' },
  { group: 'colors', label: 'Colors and border' },
];

/** One optional param of one card. It is required so a new option cannot go ungrouped. */
export interface CardOption extends CardField {
  group: OptionGroup;
}

/** A card, its params, and the core handler that renders it. */
export interface CardKind {
  id: string;
  label: string;
  /** Whether rendering it calls the GitHub API, and so needs a token. */
  needsToken: boolean;
  /** Asked first, before the menu opens, so no section applies to them. */
  required: ReadonlyArray<CardField>;
  /** Everything else, navigable in any order. */
  options: ReadonlyArray<CardOption>;
  /** @returns The rendered card, or the rendered error. */
  render: (query: Record<string, string>, config: CardConfig) => Promise<ApiResult>;
}

const THEME_NAMES = Object.keys(themes);

/** Colors and the theme, which every card accepts. */
export const COMMON_OPTIONS: ReadonlyArray<CardOption> = [
  {
    name: 'theme',
    label: 'Theme',
    kind: 'choice',
    group: 'colors',
    choices: THEME_NAMES,
    hint: 'An unknown name falls back to the default theme',
  },
  {
    name: 'title_color',
    label: 'Title color',
    kind: 'text',
    group: 'colors',
    hint: 'Hex, no #',
  },
  { name: 'text_color', label: 'Text color', kind: 'text', group: 'colors', hint: 'Hex, no #' },
  { name: 'icon_color', label: 'Icon color', kind: 'text', group: 'colors', hint: 'Hex, no #' },
  {
    name: 'bg_color',
    label: 'Background color',
    kind: 'text',
    group: 'colors',
    hint: 'Hex, no #, or a gradient: angle,color,color',
  },
  {
    name: 'border_color',
    label: 'Border color',
    kind: 'text',
    group: 'colors',
    hint: 'Hex, no #',
  },
  { name: 'border_radius', label: 'Border radius', kind: 'number', group: 'colors' },
  { name: 'hide_border', label: 'Hide the border', kind: 'boolean', group: 'colors' },
];

/**
 * The two ends of a card's date range.
 *
 * @returns The pair, naming what it counts.
 */
const rangeOptions = (counted: string): ReadonlyArray<CardOption> => {
  const hint = 'A year, a month or a day: 2024, 2024-03, 2024-03-15';
  return [
    { name: 'from', label: `Count ${counted} from`, kind: 'text', group: 'data', hint },
    { name: 'to', label: `Count ${counted} up to`, kind: 'text', group: 'data', hint },
  ];
};

const LOCALE_OPTION: CardOption = {
  name: 'locale',
  label: 'Locale',
  kind: 'text',
  group: 'text',
  hint: 'Two-letter code, e.g. es',
};

const CARDS: ReadonlyArray<CardKind> = [
  {
    id: 'stats',
    label: 'Stats — commits, PRs, issues, reviews and a rank',
    needsToken: true,
    required: [{ name: 'username', label: 'GitHub username', kind: 'text' }],
    options: [
      {
        name: 'show',
        label: 'Extra stats to show',
        kind: 'list',
        group: 'display',
        choices: stats.OPTIONS.show,
      },
      {
        name: 'hide',
        label: 'Stats to hide',
        kind: 'list',
        group: 'display',
        choices: stats.OPTIONS.hide,
      },
      { name: 'show_icons', label: 'Show the stat icons', kind: 'boolean', group: 'display' },
      { name: 'hide_rank', label: 'Hide the rank circle', kind: 'boolean', group: 'display' },
      {
        name: 'rank_icon',
        label: 'Rank indicator',
        kind: 'choice',
        group: 'display',
        choices: stats.OPTIONS.rank_icon,
      },
      {
        name: 'include_all_commits',
        label: 'Count commits of all time',
        kind: 'boolean',
        group: 'data',
      },
      ...rangeOptions('commits'),
      {
        name: 'exclude_repo',
        label: 'Repositories to exclude',
        kind: 'list',
        group: 'data',
      },
      {
        name: 'repo',
        label: 'Repositories the search-based stats are scoped to',
        kind: 'list',
        group: 'data',
      },
      {
        name: 'owner',
        label: 'Owners the search-based stats are scoped to',
        kind: 'list',
        group: 'data',
      },
      {
        name: 'role',
        label: 'Owner affiliations to include',
        kind: 'list',
        group: 'data',
        choices: stats.OPTIONS.role,
      },
      {
        name: 'contribs_include_own_repos',
        label: 'Count contributions to your own repositories',
        kind: 'boolean',
        group: 'data',
      },
      { name: 'custom_title', label: 'Card title', kind: 'text', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', kind: 'boolean', group: 'text' },
      { name: 'card_width', label: 'Card width', kind: 'integer', group: 'text' },
      { name: 'line_height', label: 'Line height', kind: 'integer', group: 'text' },
      { name: 'text_bold', label: 'Bold stat values', kind: 'boolean', group: 'text' },
      {
        name: 'number_format',
        label: 'Number format',
        kind: 'choice',
        group: 'text',
        choices: stats.OPTIONS.number_format,
      },
      {
        name: 'number_precision',
        label: 'Decimals kept when abbreviating',
        kind: 'integer',
        group: 'text',
      },
      {
        name: 'disable_animations',
        label: 'Disable the animations',
        kind: 'boolean',
        group: 'text',
      },
      { name: 'ring_color', label: 'Rank ring color', kind: 'text', group: 'colors' },
      LOCALE_OPTION,
    ],
    render: stats,
  },
  {
    id: 'top-langs',
    label: 'Top languages — the languages you write most',
    needsToken: true,
    required: [{ name: 'username', label: 'GitHub username', kind: 'text' }],
    options: [
      {
        name: 'layout',
        label: 'Layout',
        kind: 'choice',
        group: 'display',
        choices: topLangs.OPTIONS.layout,
      },
      { name: 'langs_count', label: 'Languages to show', kind: 'integer', group: 'data' },
      { name: 'hide', label: 'Languages to hide', kind: 'list', group: 'data' },
      { name: 'exclude_repo', label: 'Repositories to exclude', kind: 'list', group: 'data' },
      {
        name: 'size_weight',
        label: "Weight given to a language's size",
        kind: 'number',
        group: 'data',
      },
      {
        name: 'count_weight',
        label: 'Weight given to its repository count',
        kind: 'number',
        group: 'data',
      },
      {
        name: 'stats_format',
        label: 'Show values as',
        kind: 'choice',
        group: 'display',
        choices: topLangs.OPTIONS.stats_format,
      },
      {
        name: 'hide_progress',
        label: 'Hide the progress bars',
        kind: 'boolean',
        group: 'display',
      },
      { name: 'hide_values', label: 'Hide the values', kind: 'boolean', group: 'display' },
      {
        name: 'prog_bar_bg_color',
        label: 'Progress bar background color',
        kind: 'text',
        group: 'colors',
      },
      {
        name: 'role',
        label: 'Owner affiliations to include',
        kind: 'list',
        group: 'data',
        choices: topLangs.OPTIONS.role,
      },
      { name: 'custom_title', label: 'Card title', kind: 'text', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', kind: 'boolean', group: 'text' },
      { name: 'card_width', label: 'Card width', kind: 'integer', group: 'text' },
      {
        name: 'disable_animations',
        label: 'Disable the animations',
        kind: 'boolean',
        group: 'text',
      },
      LOCALE_OPTION,
    ],
    render: topLangs,
  },
  {
    id: 'pin',
    label: 'Repository pin — one repository',
    needsToken: true,
    required: [
      { name: 'username', label: 'GitHub username', kind: 'text' },
      { name: 'repo', label: 'Repository name', kind: 'text' },
    ],
    options: [
      { name: 'show_owner', label: 'Show the owner', kind: 'boolean', group: 'display' },
      {
        name: 'show',
        label: 'Extra stats to show',
        kind: 'list',
        group: 'display',
        choices: pin.OPTIONS.show,
      },
      { name: 'show_icons', label: 'Show the stat icons', kind: 'boolean', group: 'display' },
      {
        name: 'description_lines_count',
        label: 'Lines the description wraps to',
        kind: 'integer',
        group: 'text',
      },
      {
        name: 'browser_rendering',
        label: 'Let the browser wrap the description',
        kind: 'boolean',
        group: 'text',
      },
      { name: 'card_width', label: 'Card width', kind: 'integer', group: 'text' },
      { name: 'line_height', label: 'Line height', kind: 'integer', group: 'text' },
      { name: 'text_bold', label: 'Bold stat values', kind: 'boolean', group: 'text' },
      {
        name: 'number_format',
        label: 'Number format',
        kind: 'choice',
        group: 'text',
        choices: pin.OPTIONS.number_format,
      },
      LOCALE_OPTION,
    ],
    render: pin,
  },
  {
    id: 'org',
    label: 'Organization — an organization and the totals of its public repositories',
    needsToken: true,
    required: [{ name: 'org', label: 'GitHub organization', kind: 'text' }],
    options: [
      {
        name: 'show',
        label: 'Extra stats to show',
        kind: 'list',
        group: 'display',
        choices: org.OPTIONS.show,
      },
      {
        name: 'hide',
        label: 'Stats to hide',
        kind: 'list',
        group: 'display',
        choices: org.OPTIONS.hide,
      },
      { name: 'show_icons', label: 'Show the stat icons', kind: 'boolean', group: 'display' },
      {
        name: 'hide_description',
        label: "Hide the organization's description",
        kind: 'boolean',
        group: 'display',
      },
      { name: 'custom_title', label: 'Card title', kind: 'text', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', kind: 'boolean', group: 'text' },
      { name: 'card_width', label: 'Card width', kind: 'integer', group: 'text' },
      { name: 'line_height', label: 'Line height', kind: 'integer', group: 'text' },
      { name: 'text_bold', label: 'Bold stat values', kind: 'boolean', group: 'text' },
      {
        name: 'number_format',
        label: 'Number format',
        kind: 'choice',
        group: 'text',
        choices: org.OPTIONS.number_format,
      },
      {
        name: 'disable_animations',
        label: 'Disable the animations',
        kind: 'boolean',
        group: 'text',
      },
      LOCALE_OPTION,
    ],
    render: org,
  },
  {
    id: 'contributed-to',
    label: 'Contributed to — repositories you work on, ranked',
    needsToken: true,
    required: [{ name: 'username', label: 'GitHub username', kind: 'text' }],
    options: [
      { name: 'repos_count', label: 'Repositories to show', kind: 'integer', group: 'data' },
      {
        name: 'include_own_repos',
        label: 'Include your own repositories',
        kind: 'boolean',
        group: 'data',
      },
      {
        name: 'exclude_repo',
        label: 'Repositories to exclude',
        kind: 'list',
        group: 'data',
        hint: 'Each one an owner/name, or just the name',
      },
      ...rangeOptions('contributions'),
      {
        name: 'hide_years',
        label: 'Hide the year marks',
        kind: 'boolean',
        group: 'display',
        hint: 'One mark per contribution year, filled for the years that repo got one',
      },
      { name: 'custom_title', label: 'Card title', kind: 'text', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', kind: 'boolean', group: 'text' },
      { name: 'card_width', label: 'Card width', kind: 'integer', group: 'text' },
      {
        name: 'disable_animations',
        label: 'Disable the animations',
        kind: 'boolean',
        group: 'text',
      },
      LOCALE_OPTION,
    ],
    render: contributedTo,
  },
  {
    id: 'gist',
    label: 'Gist pin — one gist',
    needsToken: true,
    required: [{ name: 'id', label: 'Gist ID', kind: 'text' }],
    options: [
      { name: 'show_owner', label: 'Show the owner', kind: 'boolean', group: 'display' },
      {
        name: 'browser_rendering',
        label: 'Let the browser wrap the description',
        kind: 'boolean',
        group: 'text',
      },
      LOCALE_OPTION,
    ],
    render: gist,
  },
  {
    id: 'wakatime',
    label: 'WakaTime — coding time per language',
    needsToken: false,
    required: [{ name: 'username', label: 'WakaTime username', kind: 'text' }],
    options: [
      {
        name: 'layout',
        label: 'Layout',
        kind: 'choice',
        group: 'display',
        choices: wakatime.OPTIONS.layout,
      },
      {
        name: 'display_format',
        label: 'Show values as',
        kind: 'choice',
        group: 'display',
        choices: wakatime.OPTIONS.display_format,
      },
      { name: 'langs_count', label: 'Languages to show', kind: 'integer', group: 'data' },
      { name: 'hide', label: 'Languages to hide', kind: 'list', group: 'data' },
      {
        name: 'hide_progress',
        label: 'Hide the progress bars',
        kind: 'boolean',
        group: 'display',
      },
      { name: 'custom_title', label: 'Card title', kind: 'text', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', kind: 'boolean', group: 'text' },
      { name: 'card_width', label: 'Card width', kind: 'integer', group: 'text' },
      { name: 'line_height', label: 'Line height', kind: 'integer', group: 'text' },
      {
        name: 'disable_animations',
        label: 'Disable the animations',
        kind: 'boolean',
        group: 'text',
      },
      {
        name: 'api_domain',
        label: 'WakaTime instance',
        kind: 'text',
        group: 'data',
        hint: 'Defaults to wakatime.com',
      },
      LOCALE_OPTION,
    ],
    render: wakatime,
  },
];

/**
 * Every card, with the options every card shares beside its own.
 * The shared ones come first so the theme heads the colors section,
 * which is where a card's own color options land behind it.
 */
export const cards: ReadonlyArray<CardKind> = CARDS.map((card) => ({
  ...card,
  options: [...COMMON_OPTIONS, ...card.options],
}));

/**
 * @returns The card, or `undefined` when nothing renders under that name.
 */
export const findCard = (id: string): CardKind | undefined => cards.find((card) => card.id === id);
