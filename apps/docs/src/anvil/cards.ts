/**
 * @file The eight cards the anvil draws.
 *
 * **The option catalog is `@stats-forge/github-stats-forge-catalog`**, imported rather than
 * restated — two forms over the same options should not be two lists. What is added here is only
 * what the catalog has no use for.
 */

import { cards as catalogue } from '@stats-forge/github-stats-forge-catalog';
import type { CardKind } from '@stats-forge/github-stats-forge-catalog';
import { org, orgActivity, pin, stats } from '@stats-forge/github-stats-forge-core/api';

import type { CardCategory } from './themes.ts';

/**
 * The fictional account every sample is drawn from. `scripts/fixtures.ts` answers as this
 * account would, and seeds each card's identity fields with these.
 */
const SAMPLE = {
  username: 'ember-smith',
  repo: 'quench',
  org: 'forge-guild',
  gist: '0a5c3e9f7d2b4e6a8c1f0b9d7e5a3c21',
  wakatime: 'ember-smith',
} as const;

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
   * sample account. The generator sends them too.
   */
  identity: Record<string, string>;
  /**
   * Every param that changes *what is fetched*, turned on, so the generator captures each card's
   * whole set of requests in one pass — an operation with no sample is a card that cannot draw.
   */
  maximal: Record<string, string>;
}

/** Keyed by the CLI's own card ids, so a card added there fails here until it is sampled. */
const EXTRAS: Readonly<Record<string, AnvilExtras>> = {
  stats: {
    docs: 'stats',
    category: 'user',
    identity: { username: SAMPLE.username },
    maximal: {
      include_all_commits: 'true',
      include_own_repos: 'true',
      show: stats.OPTIONS.show.join(','),
    },
  },
  'top-langs': {
    docs: 'top-languages',
    category: 'user',
    identity: { username: SAMPLE.username },
    maximal: {},
  },
  pin: {
    docs: 'repo-pin',
    category: 'repo',
    identity: { username: SAMPLE.username, repo: SAMPLE.repo },
    maximal: { show: pin.OPTIONS.show.join(',') },
  },
  'contributed-to': {
    docs: 'contributed-to',
    category: 'user',
    identity: { username: SAMPLE.username },
    maximal: { from: '2016' },
  },
  org: {
    docs: 'organization',
    category: 'org',
    identity: { org: SAMPLE.org },
    maximal: { show: org.OPTIONS.show.join(',') },
  },
  'org-activity': {
    docs: 'organization-activity',
    category: 'org',
    identity: { org: SAMPLE.org },
    // the commit count is a request of its own, so sampling it is what lets `show` reach it
    maximal: { show: orgActivity.OPTIONS.show.join(',') },
  },
  gist: {
    docs: 'gist-pin',
    category: 'repo',
    identity: { id: SAMPLE.gist },
    maximal: {},
  },
  wakatime: {
    docs: 'wakatime',
    category: 'user',
    identity: { username: SAMPLE.wakatime },
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

export { CARD_GROUPS, CARDS, SAMPLE, findCard };
export type { AnvilCard };
