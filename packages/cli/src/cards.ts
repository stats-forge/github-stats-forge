import {
  gist,
  pin,
  stats,
  themes,
  topLangs,
  wakatime,
} from '@stats-forge/github-stats-forge-core/api';
import type { ApiResult, CardConfig } from '@stats-forge/github-stats-forge-core/api';

/**
 * @file What each card accepts, in the order the prompts walk it.
 *
 * The core schemas validate these params;
 * this catalog is what makes them navigable, so it carries the prose and the choices a schema has no room for.
 */

/** How a param is asked for, and how the answer becomes a query string value. */
type OptionKind = 'text' | 'boolean' | 'number' | 'list' | 'choice';

/** One param of one card. */
export interface CardOption {
  /** Query param the answer is written to. */
  name: string;
  /** What the prompt asks. */
  label: string;
  kind: OptionKind;
  /** The accepted values, for `choice`. */
  choices?: ReadonlyArray<string>;
  /** Shown under the prompt, for anything the label cannot say. */
  hint?: string;
}

/** A card, its params, and the core handler that renders it. */
export interface CardKind {
  id: string;
  label: string;
  /** Whether rendering it calls the GitHub API, and so needs a token. */
  needsToken: boolean;
  /** Asked first: the card renders nothing without them. */
  required: ReadonlyArray<CardOption>;
  /** Everything else, navigable in any order. */
  options: ReadonlyArray<CardOption>;
  /**
   * @param query The answers, as a query string would carry them.
   * @param config Tokens the fetchers use.
   * @returns The rendered card, or the rendered error.
   */
  render: (query: Record<string, string>, config: CardConfig) => Promise<ApiResult>;
}

const THEME_NAMES = Object.keys(themes);

/** Colors and the theme, which every card accepts. */
const COMMON_OPTIONS: ReadonlyArray<CardOption> = [
  {
    name: 'theme',
    label: 'Theme',
    kind: 'choice',
    choices: THEME_NAMES,
    hint: 'An unknown name falls back to the default theme',
  },
  {
    name: 'title_color',
    label: 'Title color',
    kind: 'text',
    hint: 'Hex, no #',
  },
  { name: 'text_color', label: 'Text color', kind: 'text', hint: 'Hex, no #' },
  { name: 'icon_color', label: 'Icon color', kind: 'text', hint: 'Hex, no #' },
  {
    name: 'bg_color',
    label: 'Background color',
    kind: 'text',
    hint: 'Hex, no #, or a gradient: angle,color,color',
  },
  {
    name: 'border_color',
    label: 'Border color',
    kind: 'text',
    hint: 'Hex, no #',
  },
  { name: 'border_radius', label: 'Border radius', kind: 'number' },
  { name: 'hide_border', label: 'Hide the border', kind: 'boolean' },
];

const LOCALE_OPTION: CardOption = {
  name: 'locale',
  label: 'Locale',
  kind: 'text',
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
        hint: 'e.g. reviews,discussions_started,prs_merged,contributions',
      },
      {
        name: 'hide',
        label: 'Stats to hide',
        kind: 'list',
        hint: 'e.g. stars,commits,prs,issues,contribs',
      },
      { name: 'show_icons', label: 'Show the stat icons', kind: 'boolean' },
      { name: 'hide_rank', label: 'Hide the rank circle', kind: 'boolean' },
      {
        name: 'rank_icon',
        label: 'Rank indicator',
        kind: 'choice',
        choices: stats.RANK_ICONS,
      },
      {
        name: 'include_all_commits',
        label: 'Count commits of all time',
        kind: 'boolean',
      },
      {
        name: 'commits_year',
        label: 'Count commits for one year',
        kind: 'number',
        hint: 'Four digits, e.g. 2025',
      },
      {
        name: 'exclude_repo',
        label: 'Repositories to exclude',
        kind: 'list',
      },
      {
        name: 'repo',
        label: 'Repositories the search-based stats are scoped to',
        kind: 'list',
      },
      {
        name: 'owner',
        label: 'Owners the search-based stats are scoped to',
        kind: 'list',
      },
      {
        name: 'role',
        label: 'Owner affiliations to include',
        kind: 'list',
        hint: 'OWNER, COLLABORATOR, ORGANIZATION_MEMBER',
      },
      {
        name: 'contribs_include_own_repos',
        label: 'Count contributions to your own repositories',
        kind: 'boolean',
      },
      { name: 'custom_title', label: 'Card title', kind: 'text' },
      { name: 'hide_title', label: 'Hide the title', kind: 'boolean' },
      { name: 'card_width', label: 'Card width', kind: 'number' },
      { name: 'line_height', label: 'Line height', kind: 'number' },
      { name: 'text_bold', label: 'Bold stat values', kind: 'boolean' },
      {
        name: 'number_format',
        label: 'Number format',
        kind: 'choice',
        choices: ['short', 'long'],
      },
      {
        name: 'number_precision',
        label: 'Decimals kept when abbreviating',
        kind: 'number',
      },
      {
        name: 'disable_animations',
        label: 'Disable the animations',
        kind: 'boolean',
      },
      { name: 'ring_color', label: 'Rank ring color', kind: 'text' },
      LOCALE_OPTION,
    ],
    render: (query, config) => stats(query, config),
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
        choices: topLangs.LAYOUTS,
      },
      { name: 'langs_count', label: 'Languages to show', kind: 'number' },
      { name: 'hide', label: 'Languages to hide', kind: 'list' },
      { name: 'exclude_repo', label: 'Repositories to exclude', kind: 'list' },
      {
        name: 'size_weight',
        label: "Weight given to a language's size",
        kind: 'number',
      },
      {
        name: 'count_weight',
        label: 'Weight given to its repository count',
        kind: 'number',
      },
      {
        name: 'stats_format',
        label: 'Show values as',
        kind: 'choice',
        choices: topLangs.STATS_FORMATS,
      },
      {
        name: 'hide_progress',
        label: 'Hide the progress bars',
        kind: 'boolean',
      },
      { name: 'hide_values', label: 'Hide the values', kind: 'boolean' },
      {
        name: 'prog_bar_bg_color',
        label: 'Progress bar background color',
        kind: 'text',
      },
      { name: 'role', label: 'Owner affiliations to include', kind: 'list' },
      { name: 'custom_title', label: 'Card title', kind: 'text' },
      { name: 'hide_title', label: 'Hide the title', kind: 'boolean' },
      { name: 'card_width', label: 'Card width', kind: 'number' },
      {
        name: 'disable_animations',
        label: 'Disable the animations',
        kind: 'boolean',
      },
      LOCALE_OPTION,
    ],
    render: (query, config) => topLangs(query, config),
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
      { name: 'show_owner', label: 'Show the owner', kind: 'boolean' },
      {
        name: 'show',
        label: 'Extra stats to show',
        kind: 'list',
        hint: 'e.g. prs_authored,issues_commented',
      },
      { name: 'show_icons', label: 'Show the stat icons', kind: 'boolean' },
      {
        name: 'description_lines_count',
        label: 'Lines the description wraps to',
        kind: 'number',
      },
      {
        name: 'browser_rendering',
        label: 'Let the browser wrap the description',
        kind: 'boolean',
      },
      { name: 'card_width', label: 'Card width', kind: 'number' },
      { name: 'line_height', label: 'Line height', kind: 'number' },
      { name: 'text_bold', label: 'Bold stat values', kind: 'boolean' },
      {
        name: 'number_format',
        label: 'Number format',
        kind: 'choice',
        choices: ['short', 'long'],
      },
      LOCALE_OPTION,
    ],
    render: (query, config) => pin(query, config),
  },
  {
    id: 'gist',
    label: 'Gist pin — one gist',
    needsToken: true,
    required: [{ name: 'id', label: 'Gist ID', kind: 'text' }],
    options: [
      { name: 'show_owner', label: 'Show the owner', kind: 'boolean' },
      {
        name: 'browser_rendering',
        label: 'Let the browser wrap the description',
        kind: 'boolean',
      },
    ],
    render: (query, config) => gist(query, config),
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
        choices: wakatime.LAYOUTS,
      },
      {
        name: 'display_format',
        label: 'Show values as',
        kind: 'choice',
        choices: wakatime.DISPLAY_FORMATS,
      },
      { name: 'langs_count', label: 'Languages to show', kind: 'number' },
      { name: 'hide', label: 'Languages to hide', kind: 'list' },
      {
        name: 'hide_progress',
        label: 'Hide the progress bars',
        kind: 'boolean',
      },
      { name: 'custom_title', label: 'Card title', kind: 'text' },
      { name: 'hide_title', label: 'Hide the title', kind: 'boolean' },
      { name: 'card_width', label: 'Card width', kind: 'number' },
      { name: 'line_height', label: 'Line height', kind: 'number' },
      {
        name: 'disable_animations',
        label: 'Disable the animations',
        kind: 'boolean',
      },
      {
        name: 'api_domain',
        label: 'WakaTime instance',
        kind: 'text',
        hint: 'Defaults to wakatime.com',
      },
      LOCALE_OPTION,
    ],
    render: (query, config) => wakatime(query, config),
  },
];

/** Every card, with the options every card shares appended to its own. */
export const cards: ReadonlyArray<CardKind> = CARDS.map((card) => ({
  ...card,
  options: [...card.options, ...COMMON_OPTIONS],
}));

/**
 * @param id The card's id, as `--card` takes it.
 * @returns The card, or `undefined` when nothing renders under that name.
 */
export const findCard = (id: string): CardKind | undefined => cards.find((card) => card.id === id);
