/**
 * @file What each card accepts: every option's name, label, kind and accepted values.
 *
 * The core schemas validate these params;
 * this catalog is what makes them navigable, so it carries the prose a schema has no room for
 * and reads each param's kind and choices from the schema itself.
 * It is a package of its own so that reading a card's options costs core and nothing else:
 * the CLI's prompts and the site's anvil are two forms over this one list.
 */

import {
  contributedTo,
  gist,
  org,
  orgActivity,
  pin,
  stats,
  topLangs,
  wakatime,
} from '@stats-forge/github-stats-forge-core/api';
import type {
  ApiResult,
  CardConfig,
  ParamKind,
  ParamShape,
} from '@stats-forge/github-stats-forge-core/api';

/**
 * The saved card file format, so a later change to it can be migrated rather than guessed at.
 * A file naming a higher number was written by a newer CLI and is refused.
 */
export const CARD_FILE_VERSION = 1;

/** How a param is asked for, and how the answer becomes a query string value: core's own word for it. */
export type OptionKind = ParamKind;

/**
 * Which kinds are numeric, and how finely each moves.
 * The split follows core's own: a param it reads with `intParam` is an `integer`,
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

/** One param of one card: its `kind` and `choices` are core's, the prose the catalog's. */
export interface CardField extends ParamShape {
  /** Query param the answer is written to. */
  name: string;
  /** What the prompt asks. */
  label: string;
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

/** What the catalog says of a param, before core's shape of it is added. */
type FieldSpec = Omit<CardField, keyof ParamShape>;
type OptionSpec = Omit<CardOption, keyof ParamShape>;

interface CardSpec extends Omit<CardKind, 'required' | 'options' | 'render'> {
  required: ReadonlyArray<FieldSpec>;
  options: ReadonlyArray<OptionSpec>;
  render: CardKind['render'] & { PARAMS: Readonly<Record<string, ParamShape>> };
}

/** Colors and the theme, which every card accepts. */
const COMMON_OPTIONS: ReadonlyArray<OptionSpec> = [
  { name: 'theme', label: 'Theme', group: 'colors', hint: 'An unknown name is an error' },
  { name: 'title_color', label: 'Title color', group: 'colors', hint: 'Hex, no #' },
  { name: 'text_color', label: 'Text color', group: 'colors', hint: 'Hex, no #' },
  { name: 'icon_color', label: 'Icon color', group: 'colors', hint: 'Hex, no #' },
  {
    name: 'bg_color',
    label: 'Background color',
    group: 'colors',
    hint: 'Hex, no #, or a gradient: angle,color,color',
  },
  { name: 'border_color', label: 'Border color', group: 'colors', hint: 'Hex, no #' },
  { name: 'border_radius', label: 'Border radius', group: 'colors' },
  { name: 'hide_border', label: 'Hide the border', group: 'colors' },
];

/**
 * The two ends of a card's date range.
 *
 * @returns The pair, naming what it counts.
 */
const rangeOptions = (counted: string): ReadonlyArray<OptionSpec> => {
  const hint = 'A year, a month or a day: 2024, 2024-03, 2024-03-15';
  return [
    { name: 'from', label: `Count ${counted} from`, group: 'data', hint },
    { name: 'to', label: `Count ${counted} up to`, group: 'data', hint },
  ];
};

const LOCALE_OPTION: OptionSpec = {
  name: 'locale',
  label: 'Locale',
  group: 'text',
  hint: 'Two-letter code, e.g. es',
};

const CARDS: ReadonlyArray<CardSpec> = [
  {
    id: 'stats',
    label: 'Stats — commits, PRs, issues, reviews and a rank',
    needsToken: true,
    required: [{ name: 'username', label: 'GitHub username' }],
    options: [
      { name: 'show', label: 'Extra stats to show', group: 'display' },
      { name: 'hide', label: 'Stats to hide', group: 'display' },
      { name: 'show_icons', label: 'Show the stat icons', group: 'display' },
      { name: 'hide_rank', label: 'Hide the rank circle', group: 'display' },
      { name: 'rank_icon', label: 'Rank indicator', group: 'display' },
      { name: 'include_all_commits', label: 'Count commits of all time', group: 'data' },
      ...rangeOptions('commits'),
      { name: 'exclude_repo', label: 'Repositories to exclude', group: 'data' },
      {
        name: 'scope',
        label: 'Where the search-based stats count',
        group: 'data',
        hint: 'owner/name for a repository, owner/* for everything an owner holds',
      },
      { name: 'affiliation', label: 'Owner affiliations to include', group: 'data' },
      {
        name: 'include_own_repos',
        label: 'Count contributions to your own repositories',
        group: 'data',
      },
      { name: 'title', label: 'Card title', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', group: 'text' },
      { name: 'card_width', label: 'Card width', group: 'text' },
      { name: 'number_format', label: 'Number format', group: 'text' },
      { name: 'number_precision', label: 'Decimals kept when abbreviating', group: 'text' },
      { name: 'disable_animations', label: 'Disable the animations', group: 'text' },
      { name: 'ring_color', label: 'Rank ring color', group: 'colors' },
      LOCALE_OPTION,
    ],
    render: stats,
  },
  {
    id: 'top-langs',
    label: 'Top languages — the languages you write most',
    needsToken: true,
    required: [{ name: 'username', label: 'GitHub username' }],
    options: [
      { name: 'layout', label: 'Layout', group: 'display' },
      { name: 'langs_count', label: 'Languages to show', group: 'data' },
      { name: 'hide_langs', label: 'Languages to hide', group: 'data' },
      { name: 'exclude_repo', label: 'Repositories to exclude', group: 'data' },
      { name: 'size_weight', label: "Weight given to a language's size", group: 'data' },
      { name: 'count_weight', label: 'Weight given to its repository count', group: 'data' },
      { name: 'value_format', label: 'Show values as', group: 'display' },
      { name: 'hide_progress', label: 'Hide the progress bars', group: 'display' },
      { name: 'hide_values', label: 'Hide the values', group: 'display' },
      { name: 'prog_bar_bg_color', label: 'Progress bar background color', group: 'colors' },
      { name: 'affiliation', label: 'Owner affiliations to include', group: 'data' },
      { name: 'notebooks', label: 'Count Jupyter notebooks by', group: 'data' },
      { name: 'title', label: 'Card title', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', group: 'text' },
      { name: 'card_width', label: 'Card width', group: 'text' },
      { name: 'disable_animations', label: 'Disable the animations', group: 'text' },
      LOCALE_OPTION,
    ],
    render: topLangs,
  },
  {
    id: 'pin',
    label: 'Repository pin — one repository',
    needsToken: true,
    required: [
      { name: 'username', label: 'GitHub username' },
      { name: 'repo', label: 'Repository name' },
    ],
    options: [
      { name: 'show_owner', label: 'Show the owner', group: 'display' },
      { name: 'show', label: 'Extra stats to show', group: 'display' },
      { name: 'show_icons', label: 'Show the stat icons', group: 'display' },
      { name: 'description_lines_count', label: 'Lines the description wraps to', group: 'text' },
      { name: 'card_width', label: 'Card width', group: 'text' },
      { name: 'number_format', label: 'Number format', group: 'text' },
      { name: 'number_precision', label: 'Decimals kept when abbreviating', group: 'text' },
      { name: 'disable_animations', label: 'Disable the animations', group: 'text' },
      LOCALE_OPTION,
    ],
    render: pin,
  },
  {
    id: 'org',
    label: 'Organization — an organization and the totals of its public repositories',
    needsToken: true,
    required: [{ name: 'org', label: 'GitHub organization' }],
    options: [
      { name: 'show', label: 'Extra stats to show', group: 'display' },
      { name: 'hide', label: 'Stats to hide', group: 'display' },
      { name: 'show_icons', label: 'Show the stat icons', group: 'display' },
      { name: 'hide_description', label: "Hide the organization's description", group: 'display' },
      { name: 'title', label: 'Card title', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', group: 'text' },
      { name: 'card_width', label: 'Card width', group: 'text' },
      { name: 'number_format', label: 'Number format', group: 'text' },
      { name: 'number_precision', label: 'Decimals kept when abbreviating', group: 'text' },
      { name: 'disable_animations', label: 'Disable the animations', group: 'text' },
      LOCALE_OPTION,
    ],
    render: org,
  },
  {
    id: 'org-activity',
    label: 'Organization activity — what an organization did over a window',
    needsToken: true,
    required: [{ name: 'org', label: 'GitHub organization' }],
    options: [
      {
        name: 'days',
        label: 'Days to count',
        group: 'data',
        hint: 'The window ends today; 30 by default. Leave it out to count from and up to dates',
      },
      ...rangeOptions('activity'),
      {
        name: 'show',
        label: 'Extra stats to show',
        group: 'display',
        hint: 'Commits cost a second request to GitHub',
      },
      { name: 'hide', label: 'Stats to hide', group: 'display' },
      { name: 'show_icons', label: 'Show the stat icons', group: 'display' },
      { name: 'title', label: 'Card title', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', group: 'text' },
      { name: 'card_width', label: 'Card width', group: 'text' },
      { name: 'number_format', label: 'Number format', group: 'text' },
      { name: 'number_precision', label: 'Decimals kept when abbreviating', group: 'text' },
      { name: 'disable_animations', label: 'Disable the animations', group: 'text' },
      LOCALE_OPTION,
    ],
    render: orgActivity,
  },
  {
    id: 'contributed-to',
    label: 'Contributed to — repositories you work on, ranked',
    needsToken: true,
    required: [{ name: 'username', label: 'GitHub username' }],
    options: [
      { name: 'repos_count', label: 'Repositories to show', group: 'data' },
      { name: 'include_own_repos', label: 'Include your own repositories', group: 'data' },
      {
        name: 'exclude_repo',
        label: 'Repositories to exclude',
        group: 'data',
        hint: 'Each one an owner/name, or just the name',
      },
      ...rangeOptions('contributions'),
      {
        name: 'hide_years',
        label: 'Hide the year marks',
        group: 'display',
        hint: 'One mark per contribution year, filled for the years that repo got one',
      },
      { name: 'title', label: 'Card title', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', group: 'text' },
      { name: 'card_width', label: 'Card width', group: 'text' },
      { name: 'disable_animations', label: 'Disable the animations', group: 'text' },
      LOCALE_OPTION,
    ],
    render: contributedTo,
  },
  {
    id: 'gist',
    label: 'Gist pin — one gist',
    needsToken: true,
    required: [{ name: 'id', label: 'Gist ID' }],
    options: [
      { name: 'show_owner', label: 'Show the owner', group: 'display' },
      { name: 'disable_animations', label: 'Disable the animations', group: 'text' },
      LOCALE_OPTION,
    ],
    render: gist,
  },
  {
    id: 'wakatime',
    label: 'WakaTime — coding time per language',
    needsToken: false,
    required: [{ name: 'username', label: 'WakaTime username' }],
    options: [
      { name: 'layout', label: 'Layout', group: 'display' },
      { name: 'value_format', label: 'Show values as', group: 'display' },
      { name: 'langs_count', label: 'Languages to show', group: 'data' },
      { name: 'hide_langs', label: 'Languages to hide', group: 'data' },
      { name: 'hide_progress', label: 'Hide the progress bars', group: 'display' },
      { name: 'title', label: 'Card title', group: 'text' },
      { name: 'hide_title', label: 'Hide the title', group: 'text' },
      { name: 'card_width', label: 'Card width', group: 'text' },
      { name: 'disable_animations', label: 'Disable the animations', group: 'text' },
      {
        name: 'wakatime_host',
        label: 'WakaTime instance',
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
export const cards: ReadonlyArray<CardKind> = CARDS.map((card) => {
  const shaped = <T extends FieldSpec>(field: T): T & ParamShape => {
    const shape = card.render.PARAMS[field.name];
    if (!shape) {
      throw new Error(`The ${card.id} card asks for "${field.name}", which core never reads`);
    }
    return { ...field, ...shape };
  };
  return {
    ...card,
    required: card.required.map((field) => shaped(field)),
    options: [...COMMON_OPTIONS, ...card.options].map((field) => shaped(field)),
  };
});

/**
 * @returns The card, or `undefined` when nothing renders under that name.
 */
export const findCard = (id: string): CardKind | undefined => cards.find((card) => card.id === id);

/** @returns Each required answer given, in order, so a pin names its owner and its repository. */
const requiredAnswers = (
  card: CardKind,
  query: Readonly<Record<string, string | undefined>>,
): Array<string> =>
  card.required.map(({ name }) => query[name] ?? '').filter((answer) => answer !== '');

/** @returns What the card is about, as `owner/repo` for a pin, or `''` when nothing is given. */
export const cardSubject = (
  card: CardKind,
  query: Readonly<Record<string, string | undefined>>,
): string => requiredAnswers(card, query).join('/');

/**
 * Shared by the CLI and the anvil, so a card and its saved file are named alike wherever they
 * were made. Anything a file system reads specially is dropped from each answer.
 *
 * @returns `<answers>-<card>`, or the card's id alone when no answer is given.
 */
export const cardFileStem = (
  card: CardKind,
  query: Readonly<Record<string, string | undefined>>,
): string => {
  const slugs = requiredAnswers(card, query)
    .map((answer) => answer.replaceAll(/[^\w.-]+/g, '-').replaceAll(/^[.-]+|[.-]+$/g, ''))
    .filter((slug) => slug !== '');
  return [...slugs, card.id].join('-');
};

/** @returns The saved card file: its version, the card, then the options it was saved with. */
export const savedCardText = (card: CardKind, options: Readonly<Record<string, string>>): string =>
  `${JSON.stringify({ version: CARD_FILE_VERSION, card: card.id, ...options }, undefined, 2)}\n`;
