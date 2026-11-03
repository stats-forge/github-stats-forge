import type {
  OrgCalendarOrganizationFragment,
  OrgCalendarWeekFragment,
} from './generated/org-calendar.ts';
import type { GraphQLDocument } from './graphqlDocument.ts';
import { graphqlDocument } from './graphqlDocument.ts';

type OrgCalendarQueryVariables = { login: string } & Record<`week_${number}`, string>;

interface OrgCalendarQuery {
  organization: OrgCalendarOrganizationFragment | null;
  [week: `week_${number}`]: OrgCalendarWeekFragment;
}

/**
 * Build the calendar query: one aliased search per week, each costing nothing over the first,
 * so every week rides on one rate-limit point. The number of weeks is only known at runtime.
 *
 * @returns Document for `createGraphQLFetcher`.
 */
const buildOrgCalendarDocument = (
  weeks: number,
): GraphQLDocument<OrgCalendarQuery, OrgCalendarQueryVariables> => {
  const indexes = Array.from({ length: weeks }, (_, index) => index);
  const variables = indexes.map((index) => `$week_${String(index)}: String!`).join(', ');
  const searches = indexes
    .map(
      (index) =>
        `week_${String(index)}: search(query: $week_${String(index)}, type: ISSUE, first: 1) { ...OrgCalendarWeek }`,
    )
    .join('\n  ');

  // fragments must match queries/org-calendar.graphql, which generates their types
  return graphqlDocument<OrgCalendarQuery, OrgCalendarQueryVariables>(`
query orgCalendar($login: String!, ${variables}) {
  organization(login: $login) {
    ...OrgCalendarOrganization
  }
  ${searches}
}
fragment OrgCalendarWeek on SearchResultItemConnection {
  issueCount
  nodes {
    __typename
  }
}
fragment OrgCalendarOrganization on Organization {
  login
  name
}`);
};

export { buildOrgCalendarDocument };
export type { OrgCalendarQuery, OrgCalendarQueryVariables };
