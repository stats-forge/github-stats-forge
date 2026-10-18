import { describe, expect, it } from 'vitest';

import { CardError } from '../src/common/error.ts';

// never called: `tsc` checks the expectations inside
const typed = (): void => {
  // @ts-expect-error `not_allowed` needs the param it refused
  CardError.because('not_allowed');
  // @ts-expect-error `rate_limited` is worded without data
  CardError.because('rate_limited', {});
  CardError.because('user_not_found');
  CardError.because('user_not_found', { message: 'Could not resolve to a User' });
};

describe('CardError.because', () => {
  it('words a failure from the data its reason needs', () => {
    expect(CardError.because('not_allowed', { param: 'username' })).toMatchObject({
      code: 'not_allowed',
      param: 'username',
      reason: 'not_allowed',
    });
  });

  it('takes data exactly where a reason needs it', () => {
    expect(typed).toBeTypeOf('function');
  });

  it('carries no reason for a failure built any other way', () => {
    expect(new CardError('Nope', { code: 'upstream' }).reason).toBeUndefined();
  });
});
