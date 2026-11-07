import { describe, expect, it } from 'vitest';

import { CardError } from '../src/common/error.ts';

// never called: `tsc` checks the expectations inside
const typed = (): CardError => {
  // @ts-expect-error `not_allowed` needs the param it refused
  CardError.because('not_allowed');
  // @ts-expect-error `rate_limited` is worded without data
  CardError.because('rate_limited', {});
  CardError.because('user_not_found');
  CardError.because('user_not_found', { message: 'Could not resolve to a User' });
  // @ts-expect-error only the class builds one
  return new CardError('Nope', { code: 'upstream' });
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

  it.each([
    CardError.because('user_not_found'),
    CardError.because('org_not_found'),
    CardError.because('repo_not_found'),
    CardError.because('gist_not_found'),
    CardError.because('wakatime_user_not_found', { username: 'nobody' }),
    CardError.because('gist_no_files'),
  ])('offers no report for $message, which no bug caused', (error) => {
    expect(error.reportable).toBe(false);
  });

  it.each([
    [['action input `token`'], 'action input `token` may be expired or revoked'],
    [['PAT_1', 'PAT_2', 'PAT_3'], 'PAT_1, PAT_2 and PAT_3 may be expired or revoked'],
  ])('names the rejected tokens %j', (names, secondaryMessage) => {
    expect(CardError.because('tokens_rejected', { names })).toMatchObject({ secondaryMessage });
  });

  it.each([
    CardError.because('gist_unavailable', { message: undefined }),
    CardError.because('github_error', { message: 'Nope', statusText: 'Bad Gateway' }),
    CardError.because('github_unreachable', { cause: new Error('ECONNRESET') }),
    CardError.because('graphql_failed', { subject: 'stats data' }),
    CardError.because('org_activity_issues_forbidden'),
    CardError.because('org_calendar_issues_forbidden'),
    CardError.because('org_members_forbidden'),
    CardError.because('rate_limited'),
    CardError.because('stats_search_count_unavailable'),
    CardError.because('tokens_missing'),
    CardError.because('tokens_rejected', { names: ['PAT_1'] }),
    CardError.because('wakatime_unavailable', { username: 'nobody' }),
    CardError.from(new Error('Nope')),
  ])('marks $message retryable, as a repeat could answer differently', (error) => {
    expect(error.retryable).toBe(true);
  });

  it.each([
    CardError.because('gist_no_files'),
    CardError.because('invalid_param', { param: 'width', detail: 'Too wide' }),
    CardError.because('missing_param', { params: ['id'] }),
    CardError.because('not_allowed', { param: 'username' }),
    CardError.because('org_no_stats', { card: 'organization' }),
    CardError.because('stats_no_stats_or_rank'),
    CardError.because('user_not_found'),
    CardError.because('wakatime_invalid_host'),
  ])('leaves $message not retryable, by default', (error) => {
    expect(error.retryable).toBe(false);
  });

  it('carries no reason for a failure it only wrapped', () => {
    expect(CardError.from(new Error('Nope')).reason).toBeUndefined();
  });

  it('wraps a thrown value that is not an error as upstream', () => {
    expect(CardError.from('nope')).toMatchObject({
      code: 'upstream',
      message: 'An unknown error occurred',
    });
  });
});
