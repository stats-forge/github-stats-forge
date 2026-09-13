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
  issuesOpened: { issueCount: number };
  issuesClosed: { issueCount: number };
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
  issuesOpened: search(query: $issuesOpened, type: ISSUE) {
    issueCount
  }
  issuesClosed: search(query: $issuesClosed, type: ISSUE) {
    issueCount
  }
  discussions: search(query: $discussions, type: DISCUSSION) {
    discussionCount
  }
}`);
