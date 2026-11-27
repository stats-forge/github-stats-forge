// Generated file — see .github/CONTRIBUTING.md

import { graphqlDocument } from '../graphqlDocument.ts';
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type UserContributionYearsQueryVariables = Exact<{
  login: string;
}>;

export type UserContributionYearsQuery = {
  user: { login: string; contributionsCollection: { contributionYears: Array<number> } } | null;
};

export const UserContributionYearsDocument = graphqlDocument<
  UserContributionYearsQuery,
  UserContributionYearsQueryVariables
>(`
query userContributionYears($login: String!) {
  user(login: $login) {
    login
    contributionsCollection {
      contributionYears
    }
  }
}`);
