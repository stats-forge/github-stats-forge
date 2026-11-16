import { httpRequest } from '@stats-forge/card-kit';
import type { FetchLike, HttpResponse } from '@stats-forge/card-kit';

import type { GraphQLDocument } from '../graphql/graphqlDocument.ts';

/** GitHub.com's REST API, which a GitHub Enterprise Server host replaces with its own `/api/v3`. */
const GITHUB_API_URL = 'https://api.github.com';

/**
 * Where the GraphQL API sits beside a REST base, as Octokit derives it: GitHub.com keeps it beside
 * the REST API, and an Enterprise Server moves it from `/api/v3` to `/api/graphql`.
 *
 * @returns The GraphQL endpoint.
 */
const graphqlUrl = (apiUrl: string): string => `${apiUrl.replace(/\/api\/v3$/, '/api')}/graphql`;

/** What the retryer hands a fetcher on each attempt. */
interface FetcherContext {
  /** Transport to send the request with. */
  fetch: FetchLike;
  /** The REST API's base, with no trailing slash: `https://api.github.com` unless the host says. */
  apiUrl: string;
  /** Attempt index, from 0. Tests read it to fake a rate limit on the first token. */
  retries: number;
}

/** Response of a GraphQL call: the envelope the GitHub API wraps results in. */
type GraphQLResponse<TResult> = HttpResponse<{
  data: TResult;
  errors?: Array<{
    type?: string;
    message?: string;
    /** The field the error is about, from the operation root: `['organization', 'membersWithRole']`. */
    path?: Array<string | number>;
  }>;
}>;

/** The `type` of the one error standing in for a reply that is no GraphQL envelope. */
const UNREADABLE_REPLY = 'UNREADABLE_REPLY';

/**
 * GitHub gives up on a slow request with an HTML `502` page, so a reply may carry neither `data`
 * nor `errors`; every fetcher reads `errors` first, so this makes it one.
 *
 * @returns The body when it is an envelope; otherwise one lone {@link UNREADABLE_REPLY} error,
 * keeping a top-level `message`, where GitHub says a token is bad, for the retryer.
 */
const asEnvelope = (body: unknown): unknown => {
  if (typeof body !== 'object' || body === null) {
    return { errors: [{ type: UNREADABLE_REPLY }] };
  }
  if ('data' in body || 'errors' in body) {
    return body;
  }
  if ('message' in body && typeof body.message === 'string') {
    return { message: body.message, errors: [{ type: UNREADABLE_REPLY, message: body.message }] };
  }
  return { errors: [{ type: UNREADABLE_REPLY }] };
};

/**
 * @returns A fetcher `retryer` can drive.
 */
const createGraphQLFetcher =
  <TResult, TVariables>(document: GraphQLDocument<TResult, TVariables>) =>
  async (
    variables: TVariables,
    token: string,
    { fetch, apiUrl }: FetcherContext,
  ): Promise<GraphQLResponse<TResult>> => {
    const response = await httpRequest<GraphQLResponse<TResult>['data']>(
      fetch,
      graphqlUrl(apiUrl),
      {
        method: 'POST',
        headers: {
          Authorization: `bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: document.text, variables }),
      },
    );
    return { ...response, data: asEnvelope(response.data) as GraphQLResponse<TResult>['data'] };
  };

export { createGraphQLFetcher, GITHUB_API_URL, UNREADABLE_REPLY };
export type { FetcherContext, GraphQLResponse };
