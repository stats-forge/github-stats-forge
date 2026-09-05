import { CardError } from '../common/error.ts';
import type { GraphQLResponse } from '../common/http.ts';
import { logger } from '../common/log.ts';
import { wrapTextMultiline } from '../common/render.ts';

/**
 * Turn a GraphQL `errors` payload into the error to throw.
 *
 * Its own module because two fetchers classify with it, and neither may import the other:
 * `stats.ts` reads the repository walk out of `contributed-to.ts`.
 *
 * @returns The error, worded from the first entry or from `fallback`.
 */
const graphqlError = (
  errors: NonNullable<GraphQLResponse<unknown>['data']['errors']>,
  statusText: string,
  fallback: string,
): CardError => {
  logger.error(errors);
  const message = errors[0]?.message;
  return message
    ? new CardError(wrapTextMultiline(message, 525, 12)[0] ?? '', {
        code: 'upstream',
        secondaryMessage: statusText,
      })
    : new CardError(fallback, { code: 'upstream' });
};

export { graphqlError };
