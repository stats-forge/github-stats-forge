import type { GraphQLDocument } from '../graphql/graphqlDocument.js';

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
const defaultFetch: FetchLike = (input, init) => fetch(input, init);

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
 * @param fetchImpl Transport to send the request with.
 * @param url Absolute URL to request.
 * @param init Request init forwarded to the transport.
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
  errors?: Array<{ type?: string; message?: string }>;
}>;

/**
 * @param document Generated query document.
 * @param scheme `Authorization` scheme for the token.
 * @returns A fetcher `retryer` can drive.
 */
const createGraphQLFetcher = <TResult, TVariables>(
  document: GraphQLDocument<TResult, TVariables>,
  scheme: 'bearer' | 'token',
) => {
  return (
    variables: TVariables,
    token: string,
    { fetch }: FetcherContext,
  ): Promise<GraphQLResponse<TResult>> => {
    return httpRequest(fetch, GITHUB_GRAPHQL_API, {
      method: 'POST',
      headers: {
        Authorization: `${scheme} ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: document.text, variables }),
    });
  };
};

export { createGraphQLFetcher, defaultFetch, httpRequest };
export type { FetcherContext, FetchLike, GraphQLResponse, HttpResponse };
