// Generated file — see .github/CONTRIBUTING.md

/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
import { graphqlDocument } from '../graphqlDocument.ts';
export type OrgRepoInfoFragment = {
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { color: string | null; name: string } | null;
  watchers: { totalCount: number };
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
  releases: { totalCount: number };
  defaultBranchRef: {
    target: { history: { totalCount: number } } | Record<PropertyKey, never> | null;
  } | null;
};

export type GetOrganizationQueryVariables = Exact<{
  login: string;
  after?: string | null | undefined;
}>;

export type GetOrganizationQuery = {
  organization: {
    login: string;
    name: string | null;
    description: string | null;
    createdAt: string;
    membersWithRole: { totalCount: number };
    repositories: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        stargazerCount: number;
        forkCount: number;
        primaryLanguage: { color: string | null; name: string } | null;
        watchers: { totalCount: number };
        issues: { totalCount: number };
        pullRequests: { totalCount: number };
        releases: { totalCount: number };
        defaultBranchRef: {
          target: { history: { totalCount: number } } | Record<PropertyKey, never> | null;
        } | null;
      } | null> | null;
    };
  } | null;
};

export const GetOrganizationDocument = graphqlDocument<
  GetOrganizationQuery,
  GetOrganizationQueryVariables
>(`
query getOrganization($login: String!, $after: String) {
  organization(login: $login) {
    login
    name
    description
    createdAt
    membersWithRole {
      totalCount
    }
    repositories(
      first: 100
      after: $after
      privacy: PUBLIC
      isFork: false
      orderBy: {field: STARGAZERS, direction: DESC}
    ) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...OrgRepoInfo
      }
    }
  }
}
fragment OrgRepoInfo on Repository {
  stargazerCount
  forkCount
  primaryLanguage {
    color
    name
  }
  watchers {
    totalCount
  }
  issues(states: OPEN) {
    totalCount
  }
  pullRequests(states: OPEN) {
    totalCount
  }
  releases {
    totalCount
  }
  defaultBranchRef {
    target {
      ... on Commit {
        history {
          totalCount
        }
      }
    }
  }
}`);
