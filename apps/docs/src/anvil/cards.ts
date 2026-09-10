/**
 * @file The seven cards the anvil draws.
 *
 * **The option catalog is the CLI's**, imported rather than restated — two forms over the same
 * options should not be two lists. What is added here is only what the CLI has no use for.
 */

import { cards as catalogue } from '@stats-forge/github-stats-forge-cli/cards';
import type { CardKind } from '@stats-forge/github-stats-forge-cli/cards';
import { org, pin, stats } from '@stats-forge/github-stats-forge-core/api';

import type { CardCategory } from './themes.ts';

/** The account every card but wakatime and gist is sampled from. */
const SAMPLE_USERNAME = 'marcalexiei';

/** Wakatime is a different service, so it has its own public sample profile. */
const SAMPLE_WAKATIME_USERNAME = 'ffflabs';

/** The organization the org card samples: this project's own. */
const SAMPLE_ORGANIZATION = 'stats-forge';

/** The gist the pin card samples. */
const SAMPLE_GIST_ID = '1f13e82cb48a9058ebcbf4945f5a1c20';

/** What the anvil knows about a card that the CLI does not need to. */
interface AnvilExtras {
  /** What the card is about: it groups the picker and picks its theme half — see `themes.ts`. */
  category: CardCategory;
  /**
   * This card's page under `docs/cards/`, linked as the card changes. The names differ from the
   * card ids, so `anvil.astro` checks each against the content collection at build time.
   */
  docs: string;
  /**
   * The params that identify whose card it is. They seed the required fields, which are then
   * editable — so the saved file names whoever was typed while the preview still draws the
   * recording. The recorder sends them too.
   */
  identity: Record<string, string>;
  /**
   * Every param that changes *what is fetched*, turned on, so the recorder captures each card's
   * whole set of requests in one pass — an unrecorded operation is a card that cannot draw.
   */
  maximal: Record<string, string>;
}

/** Keyed by the CLI's own card ids, so a card added there fails here until it is sampled. */
const EXTRAS: Readonly<Record<string, AnvilExtras>> = {
  stats: {
    docs: 'stats',
    category: 'user',
    identity: { username: SAMPLE_USERNAME },
    maximal: {
      include_all_commits: 'true',
      contribs_include_own_repos: 'true',
      show: stats.OPTIONS.show.join(','),
    },
  },
  'top-langs': {
    docs: 'top-languages',
    category: 'user',
    identity: { username: SAMPLE_USERNAME },
    maximal: {},
  },
  pin: {
    docs: 'repo-pin',
    category: 'repo',
    identity: { username: SAMPLE_USERNAME, repo: 'eslint-zod' },
    maximal: { show: pin.OPTIONS.show.join(',') },
  },
  'contributed-to': {
    docs: 'contributed-to',
    category: 'user',
    identity: { username: SAMPLE_USERNAME },
    maximal: { from: '2016' },
  },
  org: {
    docs: 'organization',
    category: 'org',
    identity: { org: SAMPLE_ORGANIZATION },
    maximal: { show: org.OPTIONS.show.join(',') },
  },
  gist: {
    docs: 'gist-pin',
    category: 'repo',
    identity: { id: SAMPLE_GIST_ID },
    maximal: {},
  },
  wakatime: {
    docs: 'wakatime',
    category: 'user',
    identity: { username: SAMPLE_WAKATIME_USERNAME },
    maximal: {},
  },
};

/** A card the anvil can draw: the CLI's catalog entry, plus what the anvil adds. */
type AnvilCard = CardKind & AnvilExtras;

/**
 * Every card, in the order the CLI lists them. Throws when one has no entry here, or a required
 * param no seed — either way the card could not be drawn, and this is how it gets noticed.
 */
const CARDS: ReadonlyArray<AnvilCard> = catalogue.map((card) => {
  const extras = EXTRAS[card.id];
  if (extras === undefined) {
    throw new Error(`The anvil has no sample data for the "${card.id}" card`);
  }
  for (const { name } of card.required) {
    if (extras.identity[name] === undefined) {
      throw new Error(`The anvil has no sample "${name}" for the "${card.id}" card`);
    }
  }
  return { ...card, ...extras };
});

/** One heading in the card picker, and the cards under it. */
interface CardGroup {
  label: string;
  values: Array<string>;
}

/** The headings, in the order the picker shows them. */
const GROUP_LABELS: ReadonlyArray<[CardCategory, string]> = [
  ['user', 'User'],
  ['repo', 'Repository or gist'],
  ['org', 'Organization'],
];

/**
 * The cards under the heading each belongs to, keeping the CLI's order within a group and
 * dropping a heading no card sits under — the shape `themeGroups` hands the same control.
 */
const CARD_GROUPS: ReadonlyArray<CardGroup> = GROUP_LABELS.map(([category, label]) => ({
  label,
  values: CARDS.filter((card) => card.category === category).map((card) => card.id),
})).filter((group) => group.values.length > 0);

/** @returns The card with that id, or `undefined`. */
const findCard = (id: string): AnvilCard | undefined => CARDS.find((card) => card.id === id);

export { CARD_GROUPS, CARDS, findCard };
export type { AnvilCard };
