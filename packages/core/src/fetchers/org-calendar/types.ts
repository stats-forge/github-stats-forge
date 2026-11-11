import type { ORG_CALENDAR_COUNTS } from '../../common/constants.ts';

/** One week of an organization's calendar. */
export interface OrgCalendarWeek {
  /** Its first day, in UTC. */
  from: Date;
  /** Its last day, in UTC: today for the newest week. */
  to: Date;
  count: number;
}

export interface OrgCalendarData {
  /** GitHub's own casing of the login, which the query param need not match. */
  login: string;
  /** The organization's display name, or its login when it has none. */
  name: string;
  /** The one repository counted, in GitHub's casing; `null` when the whole organization is. */
  repository: string | null;
  /** What each week counts. */
  count: (typeof ORG_CALENDAR_COUNTS)[number];
  /** The weeks, oldest first, the last ending today. */
  weeks: Array<OrgCalendarWeek>;
}
