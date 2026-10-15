/**
 * @file The api layer is the trust boundary:
 * a query string arrives as strings, and each endpoint declares what it accepts as a schema over them.
 * Parsing happens here once;
 * the render functions are handed typed values and keep their own defaults.
 *
 * `zod/mini` rather than `zod`:
 * this package ships to the browser, and the functional API tree-shakes down to the checks used below.
 */

import * as z from 'zod/mini';

import type { ColorParams } from '../common/color.ts';
import { COLOR_PARAM_KEYS, THEME_PARAM_KEYS, isValidColorInput } from '../common/color.ts';
import {
  GITHUB_USERNAME_PATTERN,
  HOSTNAME_PATTERN,
  WAKATIME_USERNAME_PATTERN,
} from '../common/constants.ts';
import { getWidestRange, parseRangeDate } from '../common/date.ts';
import { CardError } from '../common/error.ts';
import { isLocaleAvailable } from '../common/localize.ts';
import { parseArray, parseBoolean } from '../common/ops.ts';
import { themes } from '../themes/index.ts';

/** Every param arrives as a string, or not at all. */
const rawParam = z.optional(z.string());

/** Characters a repository, owner or gist id may contain. */
const SAFE_PATTERN = /^[-\w/.,]+$/;

/** What a check rejected a param for. */
type Rejection =
  | 'boolean'
  | 'number'
  | 'date'
  | 'out_of_range'
  | 'inverted_range'
  | 'unsafe'
  | 'username'
  | 'hostname'
  | 'locale'
  | 'enum'
  | 'color';

/**
 * Every rejection the api can put on an error card, in one place.
 * The param comes from the issue's own path, so no schema repeats its own name.
 */
const REJECTION_MESSAGES: Record<Rejection, (param: string) => string> = {
  boolean: (param) => `Invalid boolean input for parameter "${param}"`,
  number: (param) => `Invalid number input for parameter "${param}"`,
  date: (param) => `Invalid date input for parameter "${param}"`,
  out_of_range: (param) => `Out of range date for parameter "${param}"`,
  inverted_range: () => 'Range "from" is after "to"',
  unsafe: (param) => `Parameter "${param}" contains unsafe characters`,
  username: (param) => `Invalid username input for parameter "${param}"`,
  hostname: (param) => `Invalid hostname input for parameter "${param}"`,
  locale: () => 'Locale not found',
  enum: (param) => `Incorrect ${param} input`,
  color: (param) => `Invalid color input for parameter "${param}"`,
};

/**
 * A check that words its own rejection:
 * the message is built from the kind and the param's path rather than passed in.
 *
 * @returns The check, ready for `.check()`.
 */
const rejects = (kind: Rejection, passes: (value: string) => boolean): z.core.$ZodCheck<unknown> =>
  z.refine((value: unknown) => typeof value !== 'string' || passes(value), {
    error: (issue) => REJECTION_MESSAGES[kind](String(issue.path?.[0] ?? '')),
  });

/**
 * `?x=true` / `?x=false`, in any case.
 * Absent is `undefined`, which leaves the card's own default in place; anything else is rejected.
 */
const booleanParam = z.pipe(
  rawParam.check(rejects('boolean', (value) => parseBoolean(value) !== undefined)),
  // Narrowed: `parseBoolean` also takes booleans, which a query string cannot hold.
  z.transform((value: string | undefined) => parseBoolean(value)),
);

/** Comma-separated values, empty when the param is absent. */
const listParam = z.pipe(rawParam, z.transform(parseArray));

/**
 * A number the card cannot fall back from, so a malformed one is rejected here:
 * a render-time guard would throw into the generic catch and read as a temporary error.
 *
 * `parseFloat`, matching the coercion `Card` performs internally, so `?border_radius=10px` still renders `rx="10"`.
 * Yields the parsed number, or `undefined` when the param is absent.
 */
const numberParam: z.ZodMiniType<number | undefined, string | undefined> = z.pipe(
  rawParam.check(rejects('number', (value) => Number.isFinite(Number.parseFloat(value)))),
  z.transform((value) => (value === undefined ? undefined : Number.parseFloat(value))),
);

/**
 * A whole number — a width, a count, a line height.
 * `parseInt`, so `?card_width=500px` is still 500, but nothing numeric at all is rejected:
 * a `NaN` reaching the renderer drew `NaN` into the SVG wherever no fallback caught it.
 * Yields the parsed number, or `undefined` when the param is absent.
 */
const intParam: z.ZodMiniType<number | undefined, string | undefined> = z.pipe(
  rawParam.check(rejects('number', (value) => Number.isFinite(Number.parseInt(value, 10)))),
  z.transform((value) => (value === undefined ? undefined : Number.parseInt(value, 10))),
);

/**
 * One end of the range a card counts within, written as `2024`, `2024-03` or `2024-03-15`.
 *
 * @returns Schema yielding the instant, or `undefined` when the param is absent.
 */
const rangeParam = (end: 'from' | 'to'): z.ZodMiniType<Date | undefined, string | undefined> => {
  const parse = (value: string): Date | undefined => parseRangeDate(value, end);
  return z.pipe(
    rawParam.check(rejects('date', (value) => parse(value) !== undefined)).check(
      rejects('out_of_range', (value) => {
        const date = parse(value);
        const widest = getWidestRange();
        // a bad shape is already reported by the check above
        return date === undefined || (date >= widest.from && date <= widest.to);
      }),
    ),
    z.transform((value) => (value === undefined ? undefined : parse(value))),
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

/**
 * An id the fetchers put in a URL.
 * Rejected before any request is made, and yielded unchanged otherwise.
 */
const safeParam: z.ZodMiniType<string | undefined, string | undefined> = rawParam.check(
  rejects('unsafe', (value) => !value || SAFE_PATTERN.test(value)),
);

/**
 * A GitHub login, stricter than `safeParam`: no leading, trailing or doubled hyphen.
 * Rejected here so a malformed one is a permanent error rather than the NOT_FOUND GitHub answers.
 */
const usernameParam: z.ZodMiniType<string | undefined, string | undefined> = rawParam.check(
  rejects('username', (value) => !value || GITHUB_USERNAME_PATTERN.test(value)),
);

/** A WakaTime profile, which the fetcher puts in a URL path as one segment. */
const wakatimeUsernameParam: z.ZodMiniType<string | undefined, string | undefined> = rawParam.check(
  rejects('username', (value) => !value || WAKATIME_USERNAME_PATTERN.test(value)),
);

/**
 * A host the server is asked to fetch from.
 * A path, a query or credentials would let the query steer the request past the host it names.
 */
const hostnameParam: z.ZodMiniType<string | undefined, string | undefined> = rawParam.check(
  rejects('hostname', (value) => !value || HOSTNAME_PATTERN.test(value)),
);

/**
 * A comma-separated list of ids, each checked as {@link safeParam} checks one.
 * Yields the split values, empty when the param is absent.
 */
const safeListParam: z.ZodMiniType<Array<string>, string | undefined> = z.pipe(
  rawParam.check(
    rejects('unsafe', (value) => parseArray(value).every((entry) => SAFE_PATTERN.test(entry))),
  ),
  z.transform(parseArray),
);

/**
 * A locale the cards have translations for.
 * One wording for every endpoint:
 * the message names the param, as the number and color rejections do.
 */
const localeParam = z.pipe(
  rawParam.check(rejects('locale', (value) => !value || isLocaleAvailable(value))),
  z.transform((value) => value?.toLowerCase()),
);

/**
 * Looks an entry up in a fixed set, ignoring case.
 *
 * @returns The entry as the set spells it, or `undefined` when the set lacks it.
 */
const inSet =
  <T extends string>(values: ReadonlyArray<T>) =>
  (entry: string): T | undefined =>
    values.find((value) => value.toLowerCase() === entry.toLowerCase());

/**
 * A param the card only renders as one of a fixed set of values.
 * Matched case-insensitively and yielded as the set spells it.
 *
 * @returns Schema yielding one of `values`, or `undefined` when absent.
 */
const enumParam = <const T extends ReadonlyArray<string>>(
  values: T,
): z.ZodMiniType<T[number] | undefined, string | undefined> => {
  const canonical = inSet<T[number]>(values);
  return z.pipe(
    rawParam.check(rejects('enum', (value) => canonical(value) !== undefined)),
    z.transform((value) => (value === undefined ? undefined : canonical(value))),
  );
};

/**
 * A comma-separated list drawn from a fixed set, such as the stats a card can show.
 * Matched as {@link enumParam} matches, so `?role=owner` reads as `OWNER`;
 * one unknown entry rejects the list, since an ignored entry reads as a stat the card forgot.
 *
 * @returns Schema yielding the entries, empty when absent.
 */
const enumListParam = <const T extends ReadonlyArray<string>>(
  values: T,
): z.ZodMiniType<Array<T[number]>, string | undefined> => {
  const canonical = inSet<T[number]>(values);
  return z.pipe(
    rawParam.check(
      rejects('enum', (value) =>
        parseArray(value).every((entry) => canonical(entry) !== undefined),
      ),
    ),
    z.transform((value) => parseArray(value).flatMap((entry) => canonical(entry) ?? [])),
  );
};

/** Every color param an endpoint accepts, validated and picked in one pass. */
const colorParamsSchema = z.object(
  Object.fromEntries(
    COLOR_PARAM_KEYS.map((key) => [
      key,
      THEME_PARAM_KEYS.includes(key)
        ? enumParam(Object.keys(themes))
        : rawParam.check(rejects('color', isValidColorInput)),
    ]),
  ),
);

/**
 * The query an endpoint accepts, derived from its own schema.
 * Every param is optional and every value a string, which is all a query string can carry;
 * naming it lets a consumer typecheck the object it builds.
 */
type ApiQuery<TSchema extends z.ZodMiniType> = Partial<z.input<TSchema>> & ColorParams;

/**
 * Turns a rejection back into the error the api answers with.
 * Every rejection is the query's fault, so they share one code
 * and differ only in the message the check already worded.
 *
 * @returns The failure, ready to render.
 */
const toCardError = (error: z.core.$ZodError): CardError => {
  const [issue] = error.issues;
  return CardError.invalidParam(String(issue?.path[0] ?? ''), issue?.message ?? 'Invalid input');
};

/**
 * Runs a query through an endpoint's schema.
 *
 * Only the first rejection is reported:
 * the error card has room for one line.
 *
 * @throws {CardError} When the schema rejects a param.
 *
 * @returns The parsed params.
 */
const parseParams = <TSchema extends z.ZodMiniType>(
  schema: TSchema,
  query: unknown,
): z.output<TSchema> => {
  const result = z.safeParse(schema, query);
  if (!result.success) {
    throw toCardError(result.error);
  }
  return result.data;
};

/**
 * The color params, validated.
 * Split from the endpoint's own schema because a rejected color cannot then be used to render its own error card.
 *
 * @throws {CardError} When a param does not hold a color or a gradient.
 *
 * @returns The color params.
 */
const parseColorParams = (query: unknown): ColorParams => parseParams(colorParamsSchema, query);

export type { ApiQuery };

export {
  booleanParam,
  enumListParam,
  enumParam,
  fromParam,
  hostnameParam,
  listParam,
  ORDERED_RANGE,
  localeParam,
  intParam,
  numberParam,
  parseColorParams,
  parseParams,
  rawParam,
  safeListParam,
  safeParam,
  toParam,
  usernameParam,
  wakatimeUsernameParam,
};
