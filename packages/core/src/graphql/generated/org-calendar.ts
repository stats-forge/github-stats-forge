// Generated file — see .github/CONTRIBUTING.md

export type OrgCalendarWeekFragment = {
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

export type OrgCalendarOrganizationFragment = { login: string; name: string | null };
