import { describe, expect, it } from 'vitest';

import { cards, COMMON_OPTIONS, findCard, numericStep, OPTION_GROUPS } from '../src/index.ts';

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

  it('renders nothing for a name no card answers to', () => {
    expect(findCard('nope')).toBeUndefined();
  });
});
