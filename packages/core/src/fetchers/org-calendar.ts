import type { CardConfig } from '../common/config.ts';
import { GITHUB_USERNAME_PATTERN, ORG_CALENDAR_MAX_WEEKS } from '../common/constants.ts';
import type { ORG_CALENDAR_COUNTS } from '../common/constants.ts';
import { toSearchDate } from '../common/date.ts';
import { CardError } from '../common/error.ts';
import { createGraphQLFetcher } from '../common/http.ts';
import { clampValue } from '../common/ops.ts';
import { retryer } from '../common/retryer.ts';
import { buildOrgCalendarDocument } from '../graphql/buildOrgCalendarDocument.ts';
import type { OrgCalendarQueryVariables } from '../graphql/buildOrgCalendarDocument.ts';

import type { OrgCalendarData, OrgCalendarWeek } from './types.ts';

const urlExample = '/api/org-calendar?org=ORG_NAME';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** @returns The alias, and the variable, of a week's search. */
const weekKey = (index: number): `week_${number}` => `week_${index}`;

/** The search qualifiers each count adds to the organization and the week. */
const QUALIFIERS: Readonly<Record<(typeof ORG_CALENDAR_COUNTS)[number], string>> = {
  prs_merged: 'is:pr merged',
  prs_opened: 'is:pr created',
  issues_opened: 'is:issue created',
  issues_closed: 'is:issue closed',
};

/**
 * Seven-day weeks ending today, so the newest is never a stub. Days are UTC dates,
 * which is all a search qualifier reads.
 *
 * @returns The weeks' ends, oldest first, each counted as nothing yet.
 */
const lastWeeks = (weeks: number): Array<OrgCalendarWeek> => {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: weeks }, (_, index) => {
    const to = today - (weeks - 1 - index) * 7 * MS_PER_DAY;
    return { from: new Date(to - 6 * MS_PER_DAY), to: new Date(to), count: 0 };
  });
};

/**
 * An organization's weeks, each counting one kind of activity: pull requests merged by default.
 *
 * Every week is an aliased `search` in one GraphQL request, which costs a single rate-limit
 * point for all of them. Like any search, a week counts what its token can find, private
 * repositories included where the token reads them.
 *
 * @returns The weeks, oldest first.
 */
const fetchOrgCalendar = async (
  {
    org,
    count = 'prs_merged',
    weeks,
  }: {
    org: string | undefined;
    count?: (typeof ORG_CALENDAR_COUNTS)[number] | undefined;
    /** Weeks to cover, ending today; clamped to 1–{@link ORG_CALENDAR_MAX_WEEKS}, which is also the default. */
    weeks?: number | undefined;
  },
  config: CardConfig,
): Promise<OrgCalendarData> => {
  if (!org) {
    throw CardError.because('missing_param', { params: ['org'], hint: urlExample });
  }
  // `./fetchers` is a public export, so the login is checked here as well as at the api boundary.
  if (!GITHUB_USERNAME_PATTERN.test(org)) {
    throw CardError.because('org_invalid');
  }

  let span = ORG_CALENDAR_MAX_WEEKS;
  if (weeks !== undefined && Number.isFinite(weeks)) {
    span = clampValue(weeks, 1, ORG_CALENDAR_MAX_WEEKS);
  }
  const calendar = lastWeeks(span);

  const variables: OrgCalendarQueryVariables = { login: org };
  for (const [index, week] of calendar.entries()) {
    variables[weekKey(index)] =
      `org:${org} ${QUALIFIERS[count]}:${toSearchDate(week.from)}..${toSearchDate(week.to)}`;
  }

  const res = await retryer(
    createGraphQLFetcher(buildOrgCalendarDocument(span)),
    variables,
    config,
  );

  // GitHub gives up on a slow search with a 502 page rather than JSON
  const envelope: unknown = res.data;
  if (envelope === null || typeof envelope !== 'object') {
    throw CardError.because('graphql_failed', { subject: 'organization calendar' });
  }

  if (res.data.errors) {
    // A login that is a user, or nothing at all, answers NOT_FOUND — which `CardError.fromGraphQL`
    // words for a user query, so this endpoint's own wording is thrown instead.
    if (res.data.errors[0]?.type === 'NOT_FOUND') {
      throw CardError.because('org_not_found');
    }
    throw CardError.fromGraphQL(res.data.errors, res.statusText, 'organization calendar');
  }

  const { data } = res.data;
  if (!data.organization) {
    throw CardError.because('org_not_found');
  }

  const searches = calendar.map((_, index) => data[weekKey(index)]);
  // A token refused issues is answered with pull requests, so each week names what it matched.
  const refused =
    count.startsWith('issues') &&
    searches.some(
      (search) => (search?.issueCount ?? 0) > 0 && search?.nodes?.[0]?.__typename !== 'Issue',
    );
  if (refused) {
    throw CardError.because('org_calendar_issues_forbidden');
  }

  return {
    login: data.organization.login,
    name: data.organization.name || data.organization.login,
    count,
    weeks: calendar.map((week, index) => ({ ...week, count: searches[index]?.issueCount ?? 0 })),
  };
};

export { fetchOrgCalendar };
