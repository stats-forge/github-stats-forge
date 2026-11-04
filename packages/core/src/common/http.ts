import type { GraphQLDocument } from '../graphql/graphqlDocument.ts';

const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

/**
 * The slice of `fetch` this library calls.
 * A host substitutes it through `CardConfig` to mock, cache or proxy every request core makes.
 */
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Resolves the global `fetch` at call time rather than capturing it on import,
 * so a host that patches the global afterwards is still picked up.
 */
const defaultFetch: FetchLike = async (input, init) => fetch(input, init);

/**
 * @returns `fetchImpl`, giving up on each request after `timeoutMs`; `fetchImpl` itself without one.
 */
const withTimeout = (fetchImpl: FetchLike, timeoutMs: number | undefined): FetchLike => {
  if (timeoutMs === undefined) {
    return fetchImpl;
  }
  return async (input, init) =>
    fetchImpl(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
};

/**
 * A response, parsed.
 * A non-2xx is a value here rather than a throw:
 * the retryer reads the body of a rejected request to tell a spent token from a rate limit.
 */
interface HttpResponse<TData> {
  status: number;
  /** Reason phrase, which HTTP/2 omits — only ever used to annotate an error. */
  statusText: string;
  data: TData;
}

/** What the retryer hands a fetcher on each attempt. */
interface FetcherContext {
  /** Transport to send the request with. */
  fetch: FetchLike;
  /** Attempt index, from 0. Tests read it to fake a rate limit on the first token. */
  retries: number;
}

/**
 * @returns The response; a JSON body parsed, anything else left as text.
 */
const httpRequest = async <TData>(
  fetchImpl: FetchLike,
  url: string,
  init?: RequestInit,
): Promise<HttpResponse<TData>> => {
  const response = await fetchImpl(url, init);
  const body = await response.text();

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    // an empty or non-JSON body reads as text, so callers still get a defined `data`
    data = body;
  }

  return {
    status: response.status,
    statusText: response.statusText,
    data: data as TData,
  };
};

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
    { fetch }: FetcherContext,
  ): Promise<GraphQLResponse<TResult>> => {
    const response = await httpRequest<GraphQLResponse<TResult>['data']>(
      fetch,
      GITHUB_GRAPHQL_API,
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

export { createGraphQLFetcher, defaultFetch, httpRequest, UNREADABLE_REPLY, withTimeout };
export type { FetcherContext, FetchLike, GraphQLResponse, HttpResponse };
