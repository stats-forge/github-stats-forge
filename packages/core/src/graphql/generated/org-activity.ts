// Generated file — see .github/CONTRIBUTING.md

/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
import { graphqlDocument } from '../graphqlDocument.ts';
export type GetOrganizationActivityQueryVariables = Exact<{
  login: string;
  prsOpened: string;
  prsMerged: string;
  issuesOpened: string;
  issuesClosed: string;
  discussions: string;
}>;

export type GetOrganizationActivityQuery = {
  organization: { login: string; name: string | null } | null;
  prsOpened: { issueCount: number };
  prsMerged: { issueCount: number };
  issuesOpened: {
    issueCount: number;
    nodes: Array<
      | { __typename: 'App' }
      | { __typename: 'Discussion' }
      | { __typename: 'Issue' }
      | { __typename: 'MarketplaceListing' }
      | { __typename: 'Organization' }
      | { __typename: 'PullRequest' }
      | { __typename: 'Repository' }
      | { __typename: 'User' }
      | null
    > | null;
  };
  issuesClosed: {
    issueCount: number;
    nodes: Array<
      | { __typename: 'App' }
      | { __typename: 'Discussion' }
      | { __typename: 'Issue' }
      | { __typename: 'MarketplaceListing' }
      | { __typename: 'Organization' }
      | { __typename: 'PullRequest' }
      | { __typename: 'Repository' }
      | { __typename: 'User' }
      | null
    > | null;
  };
  discussions: { discussionCount: number };
};

export const GetOrganizationActivityDocument = graphqlDocument<
  GetOrganizationActivityQuery,
  GetOrganizationActivityQueryVariables
>(`
query getOrganizationActivity($login: String!, $prsOpened: String!, $prsMerged: String!, $issuesOpened: String!, $issuesClosed: String!, $discussions: String!) {
  organization(login: $login) {
    login
    name
  }
  prsOpened: search(query: $prsOpened, type: ISSUE) {
    issueCount
  }
  prsMerged: search(query: $prsMerged, type: ISSUE) {
    issueCount
  }
  issuesOpened: search(query: $issuesOpened, type: ISSUE, first: 1) {
    issueCount
    nodes {
      __typename
    }
  }
  issuesClosed: search(query: $issuesClosed, type: ISSUE, first: 1) {
    issueCount
    nodes {
      __typename
    }
  }
  discussions: search(query: $discussions, type: DISCUSSION) {
    discussionCount
  }
}`);
