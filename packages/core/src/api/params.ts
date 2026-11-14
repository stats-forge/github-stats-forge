/**
 * @file The params only GitHub's and WakaTime's cards take, built on the kit's helpers: a range of
 * dates, a scope of repositories, a login and a host.
 */

import { kinded, parseArray, patternParam, rawParam, rejects } from '@stats-forge/card-kit';
import type { RejectionWording } from '@stats-forge/card-kit';
import * as z from 'zod/mini';

import {
  GITHUB_USERNAME_PATTERN,
  HOSTNAME_PATTERN,
  WAKATIME_USERNAME_PATTERN,
} from '../common/constants.ts';
import { getWidestRange, parseRangeDate } from '../common/date.ts';

/** One repository, `owner/name`, or everything an owner holds, `owner/*`. */
const SCOPE_PATTERN = /^[\w.-]+\/(?:\*|[\w.-]+)$/;

/** Past this a search query nears the length GitHub refuses, which would read as an upstream error. */
const MAX_SCOPES = 10;

/**
 * Every rejection these params can put on an error card, in one place; the kit words its own.
 * The param comes from the issue's own path, so no schema repeats its own name.
 */
const REJECTION_MESSAGES: Record<
  | 'date'
  | 'out_of_range'
  | 'inverted_range'
  | 'range_conflict'
  | 'scope'
  | 'scope_unused'
  | 'username'
  | 'hostname',
  RejectionWording
> = {
  date: (param) => `Invalid date input for parameter "${param}"`,
  out_of_range: (param) => `Out of range date for parameter "${param}"`,
  inverted_range: () => 'Range "from" is after "to"',
  range_conflict: (param) => `Parameter "${param}" cannot be combined with "from" or "to"`,
  scope: (param) =>
    `Parameter "${param}" takes up to ${MAX_SCOPES} entries, each owner/name or owner/*`,
  scope_unused: (param) => `Parameter "${param}" applies only to stats counted by search`,
  username: (param) => `Invalid username input for parameter "${param}"`,
  hostname: (param) => `Invalid hostname input for parameter "${param}"`,
};

/**
 * One end of the range a card counts within, written as `2024`, `2024-03` or `2024-03-15`.
 *
 * @returns Schema yielding the instant, or `undefined` when the param is absent.
 */
const rangeParam = (end: 'from' | 'to'): z.ZodMiniType<Date | undefined, string | undefined> => {
  const parse = (value: string): Date | undefined => parseRangeDate(value, end);
  return kinded(
    'text',
    z.pipe(
      rawParam.check(rejects(REJECTION_MESSAGES.date, (value) => parse(value) !== undefined)).check(
        rejects(REJECTION_MESSAGES.out_of_range, (value) => {
          const date = parse(value);
          const widest = getWidestRange();
          // a bad shape is already reported by the check above
          return date === undefined || (date >= widest.from && date <= widest.to);
        }),
      ),
      z.transform((value) => (value === undefined ? undefined : parse(value))),
    ),
  );
};

/** The start of a card's range; see {@link rangeParam}. */
const fromParam = rangeParam('from');

/** The end of a card's range; see {@link rangeParam}. */
const toParam = rangeParam('to');

/**
 * The pair-level rule the two ends cannot see on their own.
 * Every endpoint taking a range applies it, so an order no card could draw is rejected once.
 */
const ORDERED_RANGE = z.refine<{ from?: Date | undefined; to?: Date | undefined }>(
  ({ from, to }) => from === undefined || to === undefined || from <= to,
  { error: REJECTION_MESSAGES.inverted_range('from'), path: ['from'] },
);

/** `days` is a shorthand for a range, so a query naming both says two different things. */
const DAYS_OR_RANGE = z.refine<{
  days?: number | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
}>(({ days, from, to }) => days === undefined || (from === undefined && to === undefined), {
  error: REJECTION_MESSAGES.range_conflict('days'),
  path: ['days'],
});

/**
 * A GitHub login, stricter than `safeParam`: no `_`, `.` or `/`, and 39 characters at most.
 * Rejected here so a malformed one is a permanent error rather than the NOT_FOUND GitHub answers.
 */
const usernameParam = patternParam(REJECTION_MESSAGES.username, GITHUB_USERNAME_PATTERN);

/** A WakaTime profile, which the fetcher puts in a URL path as one segment. */
const wakatimeUsernameParam = patternParam(REJECTION_MESSAGES.username, WAKATIME_USERNAME_PATTERN);

/**
 * A host the server is asked to fetch from.
 * A path, a query or credentials would let the query steer the request past the host it names.
 */
const hostnameParam = patternParam(REJECTION_MESSAGES.hostname, HOSTNAME_PATTERN);

/**
 * Where the search-based stats count: `owner/name` or `owner/*` entries. A bare name is rejected,
 * being a repository or an owner with nothing to say which.
 */
const scopeParam: z.ZodMiniType<Array<string>, string | undefined> = kinded(
  'list',
  z.pipe(
    rawParam.check(
      rejects(REJECTION_MESSAGES.scope, (value) => {
        const entries = parseArray(value);
        return entries.length <= MAX_SCOPES && entries.every((entry) => SCOPE_PATTERN.test(entry));
      }),
    ),
    z.transform(parseArray),
  ),
);

/**
 * A `scope` changes only what is counted by search, so one with no search to narrow changes nothing.
 *
 * @returns The check, over whether the query draws anything counted by search.
 */
const scopeNeedsSearch = <TQuery extends { scope: Array<string> }>(
  searches: (query: TQuery) => boolean,
): z.core.$ZodCheck<TQuery> =>
  z.refine((query: TQuery) => query.scope.length === 0 || searches(query), {
    error: REJECTION_MESSAGES.scope_unused('scope'),
    path: ['scope'],
  });

export {
  DAYS_OR_RANGE,
  fromParam,
  hostnameParam,
  ORDERED_RANGE,
  scopeNeedsSearch,
  scopeParam,
  toParam,
  usernameParam,
  wakatimeUsernameParam,
};
