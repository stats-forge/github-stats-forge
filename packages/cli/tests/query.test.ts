import { describe, expect, it } from 'vitest';

import { cards, findCard } from '../src/cards.ts';
import type { Answer } from '../src/query.ts';
import { defaultFileName, describeAnswer, toParam, toQuery } from '../src/query.ts';

describe(toParam, () => {
  it('carries a value the way a query string would', () => {
    expect(toParam('anuraghazra')).toBe('anuraghazra');
    expect(toParam(4)).toBe('4');
    expect(toParam(true)).toBe('true');
    expect(toParam(['a', 'b'])).toBe('a,b');
  });

  it('sends nothing for an unanswered option', () => {
    expect(toParam(undefined)).toBeUndefined();
    expect(toParam('')).toBeUndefined();
    expect(toParam([])).toBeUndefined();
  });

  it('keeps a false answer, which is not the same as unanswered', () => {
    expect(toParam(false)).toBe('false');
  });
});

describe(toQuery, () => {
  it('drops what was never answered', () => {
    const query = toQuery(
      new Map<string, Answer>([
        ['username', 'anuraghazra'],
        ['show_icons', true],
        ['custom_title', ''],
        ['hide', []],
      ]),
    );

    expect(query).toStrictEqual({
      username: 'anuraghazra',
      show_icons: 'true',
    });
  });
});

describe(describeAnswer, () => {
  const option = {
    name: 'show_icons',
    label: 'Show icons',
    kind: 'boolean' as const,
  };

  it('reads a boolean back as yes or no', () => {
    expect(describeAnswer(option, true)).toBe('yes');
    expect(describeAnswer(option, false)).toBe('no');
  });

  it('marks an option nothing has answered', () => {
    expect(describeAnswer(option, undefined)).toBe('—');
  });
});

describe(defaultFileName, () => {
  it('names the file after the card and its subject', () => {
    const stats = findCard('stats');
    expect(stats && defaultFileName(stats, { username: 'anuraghazra' })).toBe(
      'stats-anuraghazra.svg',
    );
  });

  it('includes the repository for a pin', () => {
    const pin = findCard('pin');
    expect(pin && defaultFileName(pin, { username: 'anuraghazra', repo: 'convoychat' })).toBe(
      'pin-anuraghazra-convoychat.svg',
    );
  });

  it('keeps a gist id, which has no username', () => {
    const gist = findCard('gist');
    expect(gist && defaultFileName(gist, { id: 'bbfce31e' })).toBe('gist-bbfce31e.svg');
  });

  it('writes a name a shell can handle', () => {
    const stats = findCard('stats');
    expect(stats && defaultFileName(stats, { username: 'a b/c' })).toBe('stats-a-b-c.svg');
  });
});

describe('the card catalog', () => {
  it('gives every card a unique id', () => {
    const ids = cards.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names every option once per card', () => {
    for (const card of cards) {
      const names = [...card.required, ...card.options].map((option) => option.name);
      expect(new Set(names).size, `${card.id} repeats an option`).toBe(names.length);
    }
  });

  it('gives every choice option its choices', () => {
    for (const card of cards) {
      for (const option of card.options.filter((entry) => entry.kind === 'choice')) {
        expect(option.choices?.length, `${card.id}.${option.name}`).toBeGreaterThan(0);
      }
    }
  });

  it('answers to an unknown card with nothing', () => {
    expect(findCard('not-a-card')).toBeUndefined();
  });
});
