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

import { cards, COMMON_OPTIONS, findCard, numericStep, OPTION_GROUPS } from '../src/index.ts';

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
      .filter((option) => option.choices?.length === 0);

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
