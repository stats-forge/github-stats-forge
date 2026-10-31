import type { CardOption } from '@stats-forge/github-stats-forge-catalog';
import { describe, expect, it } from 'vitest';

import type { Answer } from '../src/query.ts';
import {
  describeAnswer,
  fromQueryString,
  toParam,
  toQuery,
  toQueryString,
  UNSET,
} from '../src/query.ts';

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
        ['title', ''],
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
  const option: CardOption = {
    name: 'show_icons',
    label: 'Show icons',
    kind: 'boolean',
    group: 'display',
  };

  it('reads a boolean back as yes or no', () => {
    expect(describeAnswer(option, true)).toBe('yes');
    expect(describeAnswer(option, false)).toBe('no');
  });

  it('marks an option nothing has answered', () => {
    expect(describeAnswer(option, undefined)).toBe(UNSET);
  });
});

describe(toQueryString, () => {
  it('writes the query with the leading ? the action and a card URL both carry', () => {
    expect(toQueryString({ username: 'anuraghazra', theme: 'dark' })).toBe(
      '?username=anuraghazra&theme=dark',
    );
  });

  it('encodes what a query string cannot carry raw', () => {
    expect(toQueryString({ title: 'My Stats & More' })).toBe('?title=My+Stats+%26+More');
  });

  it('answers a bare ? when nothing is set, rather than an empty line', () => {
    expect(toQueryString({})).toBe('?');
  });
});

describe(fromQueryString, () => {
  it('reads back what toQueryString wrote', () => {
    const query: Record<string, string> = {
      username: 'anuraghazra',
      theme: 'dark',
      title: 'My Stats & More',
    };

    expect(fromQueryString(toQueryString(query))).toStrictEqual(query);
  });

  it('takes a query string with or without its ?', () => {
    expect(fromQueryString('username=octocat')).toStrictEqual({ username: 'octocat' });
    expect(fromQueryString('?username=octocat')).toStrictEqual({ username: 'octocat' });
  });

  it('takes the query off a whole card URL, which is what gets pasted', () => {
    expect(
      fromQueryString('https://cards.example.com/api?username=octocat&theme=dark'),
    ).toStrictEqual({ username: 'octocat', theme: 'dark' });
  });

  it('joins a repeated key, as every list param already reaches a card', () => {
    expect(fromQueryString('?hide=stars&hide=issues')).toStrictEqual({ hide: 'stars,issues' });
  });

  it('carries nothing when it was given nothing', () => {
    expect(fromQueryString('')).toStrictEqual({});
    expect(fromQueryString('   ')).toStrictEqual({});
    expect(fromQueryString('?')).toStrictEqual({});
  });
});
