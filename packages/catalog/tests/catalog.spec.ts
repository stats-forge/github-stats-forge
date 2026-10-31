import {
  COLOR_PARAM_KEYS,
  contributedTo,
  gist,
  org,
  orgActivity,
  pin,
  stats,
  topLangs,
  wakatime,
} from '@stats-forge/github-stats-forge-core/api';
import { describe, expect, it } from 'vitest';

import type { CardKind } from '../src/index.ts';
import {
  CARD_FILE_VERSION,
  cardFileStem,
  cardSubject,
  cards,
  COMMON_OPTIONS,
  findCard,
  numericStep,
  OPTION_GROUPS,
  savedCardText,
} from '../src/index.ts';

/** @returns The catalog's card, which every spec here expects to exist. */
const cardById = (id: string): CardKind => {
  const found = findCard(id);
  if (!found) {
    throw new Error(`the catalog has a ${id} card`);
  }
  return found;
};

/** The endpoint each card renders through, and so the params it reads. */
const ENDPOINTS = {
  stats,
  'top-langs': topLangs,
  pin,
  org,
  'org-activity': orgActivity,
  'contributed-to': contributedTo,
  gist,
  wakatime,
} as const;

/** The colors past the few the menu offers, which are typed into a URL rather than asked for. */
const isColorParam = (name: string): boolean =>
  (COLOR_PARAM_KEYS as ReadonlyArray<string>).includes(name);

/** @returns The endpoint the card renders through. */
const endpointOf = (card: (typeof cards)[number]): (typeof ENDPOINTS)[keyof typeof ENDPOINTS] =>
  ENDPOINTS[card.id as keyof typeof ENDPOINTS];

/** @returns Every param the card asks for, required or not. */
const paramsOf = (card: (typeof cards)[number]): Array<string> =>
  [...card.required, ...card.options].map((option) => option.name);

describe('the catalog', () => {
  it('names each card once', () => {
    const ids = cards.map((card) => card.id);

    expect(ids).toStrictEqual([...new Set(ids)]);
  });

  it('asks for each param once per card, the shared options included', () => {
    const repeated = cards.flatMap((card) => {
      const params = paramsOf(card);
      return params
        .filter((name, index) => params.indexOf(name) !== index)
        .map((name) => `${card.id}: ${name}`);
    });

    expect(repeated).toStrictEqual([]);
  });

  it('offers the shared options first, so the theme heads the colors section', () => {
    const reordered = cards
      .filter((card) => COMMON_OPTIONS.some((shared, index) => card.options[index] !== shared))
      .map((card) => card.id);

    expect(reordered).toStrictEqual([]);
  });

  it('groups every option under a section the menu shows', () => {
    const sections = new Set(OPTION_GROUPS.map(({ group }) => group));
    const ungrouped = cards.flatMap((card) =>
      card.options.filter((option) => !sections.has(option.group)),
    );

    expect(ungrouped).toStrictEqual([]);
  });

  it('offers no empty list of choices, which would draw a control nothing can be picked from', () => {
    const empty = cards
      .flatMap((card) => card.options)
      .filter((option) => option.kind === 'choice' || option.choices !== undefined)
      .filter((option) => !option.choices?.length)
      .map((option) => option.name);

    expect(empty).toStrictEqual([]);
  });

  it('steps a number by the kind alone, so neither form decides for itself', () => {
    const numeric = cards
      .flatMap((card) => card.options)
      .filter((option) => option.kind === 'integer' || option.kind === 'number');
    const mistepped = numeric
      .filter((option) => numericStep(option.kind) !== (option.kind === 'integer' ? 1 : 'any'))
      .map((option) => option.name);

    expect(numeric.length).toBeGreaterThan(0);
    expect(mistepped).toStrictEqual([]);
  });

  it('renders each card through the endpoint its id names', () => {
    const mismatched = cards.filter((card) => card.render !== endpointOf(card)).map(({ id }) => id);

    expect(mismatched).toStrictEqual([]);
  });

  it('asks for each param the way core reads it', () => {
    const misread = cards.flatMap((card) => {
      const { PARAMS } = endpointOf(card);
      return [...card.required, ...card.options]
        .filter(({ name, kind, choices }) => {
          const shape = PARAMS[name];
          return shape?.kind !== kind || shape.choices?.join(',') !== choices?.join(',');
        })
        .map(
          ({ name, kind }) => `${card.id}: ${name} is ${kind}, core reads ${PARAMS[name]?.kind}`,
        );
    });

    expect(misread).toStrictEqual([]);
  });

  it('asks for every param of its own a card reads', () => {
    const unasked = cards.flatMap((card) => {
      const asked = new Set(paramsOf(card));
      return Object.keys(endpointOf(card).PARAMS)
        .filter((name) => !asked.has(name) && !isColorParam(name))
        .map((name) => `${card.id}: ${name}`);
    });

    expect(unasked).toStrictEqual([]);
  });

  it('renders nothing for a name no card answers to', () => {
    expect(findCard('nope')).toBeUndefined();
  });
});

describe(cardFileStem, () => {
  it.each([
    { id: 'stats', query: { username: 'anuraghazra' }, stem: 'anuraghazra-stats' },
    {
      id: 'pin',
      query: { username: 'anuraghazra', repo: 'convoychat' },
      stem: 'anuraghazra-convoychat-pin',
    },
    { id: 'pin', query: { username: 'anuraghazra', repo: '' }, stem: 'anuraghazra-pin' },
    { id: 'org', query: { org: 'stats-forge' }, stem: 'stats-forge-org' },
    { id: 'gist', query: { id: 'bbfce31e' }, stem: 'bbfce31e-gist' },
    { id: 'stats', query: { username: '../a b/c.' }, stem: 'a-b-c-stats' },
    { id: 'stats', query: {}, stem: 'stats' },
  ])('names $id after $query as $stem', ({ id, query, stem }) => {
    expect(cardFileStem(cardById(id), query)).toBe(stem);
  });

  it('names a card that asks for nothing after the card alone', () => {
    expect(cardFileStem({ ...cardById('stats'), required: [] }, { username: 'octocat' })).toBe(
      'stats',
    );
  });
});

describe(cardSubject, () => {
  it('names a pin by its owner and repository, as GitHub writes them', () => {
    expect(cardSubject(cardById('pin'), { username: 'anuraghazra', repo: 'convoychat' })).toBe(
      'anuraghazra/convoychat',
    );
  });

  it('is empty while nothing is given', () => {
    expect(cardSubject(cardById('stats'), { username: '' })).toBe('');
  });
});

describe(savedCardText, () => {
  it('writes the version and the card ahead of the options', () => {
    expect(savedCardText(cardById('gist'), { id: 'abc', theme: 'dark' })).toBe(
      `${JSON.stringify({ version: CARD_FILE_VERSION, card: 'gist', id: 'abc', theme: 'dark' }, undefined, 2)}\n`,
    );
  });
});
