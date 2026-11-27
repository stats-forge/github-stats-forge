// Generated file — see .github/CONTRIBUTING.md

import { graphqlDocument } from '../graphqlDocument.ts';

import type * as Types from './common.ts';
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type TopLanguageFragment = { size: number; node: { color: string | null; name: string } };

export type TopLanguagesRepositoryFragment = {
  name: string;
  nameWithOwner: string;
  languages: {
    edges: Array<{ size: number; node: { color: string | null; name: string } } | null> | null;
  } | null;
};

export type TopLanguagesQueryVariables = Exact<{
  login: string;
  ownerAffiliations?:
    | Array<Types.RepositoryAffiliation | null | undefined>
    | Types.RepositoryAffiliation
    | null
    | undefined;
  after?: string | null | undefined;
}>;

export type TopLanguagesQuery = {
  user: {
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        name: string;
        nameWithOwner: string;
        languages: {
          edges: Array<{
            size: number;
            node: { color: string | null; name: string };
          } | null> | null;
        } | null;
      } | null> | null;
    };
  } | null;
};

export const TopLanguagesDocument = graphqlDocument<TopLanguagesQuery, TopLanguagesQueryVariables>(`
query topLanguages($login: String!, $ownerAffiliations: [RepositoryAffiliation], $after: String) {
  user(login: $login) {
    repositories(
      ownerAffiliations: $ownerAffiliations
      isFork: false
      first: 100
      after: $after
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...TopLanguagesRepository
      }
    }
  }
}
fragment TopLanguagesRepository on Repository {
  name
  nameWithOwner
  languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
    edges {
      ...TopLanguage
    }
  }
}
fragment TopLanguage on LanguageEdge {
  size
  node {
    color
    name
  }
}`);
