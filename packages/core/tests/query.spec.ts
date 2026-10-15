import { describe, expect, it } from 'vitest';

import { queryOf } from '../src/api/query.ts';

describe(queryOf, () => {
  it('joins a repeated key on commas, the way a list param reads', () => {
    expect(queryOf(new URLSearchParams('hide=stars&hide=prs&username=x'))).toStrictEqual({
      hide: 'stars,prs',
      username: 'x',
    });
  });

  it('keeps an empty value, for the handler to resolve', () => {
    expect(queryOf(new URLSearchParams('hide_border'))).toStrictEqual({ hide_border: '' });
  });
});
