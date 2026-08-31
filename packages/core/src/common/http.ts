import axios from "axios";
import type { AxiosResponse } from "axios";

import type { GraphQLDocument } from "../graphql/graphqlDocument.js";

const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";

/** Response of a GraphQL call: the envelope the GitHub API wraps results in. */
type GraphQLResponse<TResult> = AxiosResponse<{
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
  scheme: "bearer" | "token",
) => {
  return (
    variables: TVariables,
    token: string,
  ): Promise<GraphQLResponse<TResult>> => {
    return axios({
      url: GITHUB_GRAPHQL_API,
      method: "post",
      headers: { Authorization: `${scheme} ${token}` },
      data: { query: document.text, variables },
    });
  };
};

export { createGraphQLFetcher };
export type { GraphQLResponse };
