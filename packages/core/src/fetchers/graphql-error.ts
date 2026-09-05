import { CardError, USER_NOT_FOUND } from '../common/error.ts';
import type { GraphQLResponse } from '../common/http.ts';
import { logger } from '../common/log.ts';
import { wrapTextMultiline } from '../common/render.ts';

/**
 * Turn the GraphQL `errors` a user query answered with into the error to throw.
 *
 * Its own module because the fetchers classify with it, and two of them may not import each other:
 * `stats.ts` reads the repository walk out of `contributed-to.ts`.
 *
 * @returns `not_found` when the user does not resolve; otherwise `upstream`, worded from the first entry or from `fallback`.
 */
const graphqlError = (
  errors: NonNullable<GraphQLResponse<unknown>['data']['errors']>,
  statusText: string,
  fallback: string,
): CardError => {
  logger.error(errors);
  const [firstError] = errors;
  if (firstError?.type === 'NOT_FOUND') {
    return new CardError(firstError.message || 'Could not fetch user.', {
      code: 'not_found',
      secondaryMessage: USER_NOT_FOUND,
    });
  }
  const message = firstError?.message;
  return message
    ? new CardError(wrapTextMultiline(message, 525, 12)[0] ?? '', {
        code: 'upstream',
        secondaryMessage: statusText,
      })
    : new CardError(fallback, { code: 'upstream' });
};

export { graphqlError };
