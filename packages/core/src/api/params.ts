import * as z from 'zod/mini';

import type { ColorParams } from '../common/color.js';
import { COLOR_PARAM_KEYS, THEME_PARAM_KEYS, isValidColorInput } from '../common/color.js';
import { GITHUB_USERNAME_PATTERN } from '../common/constants.js';
import { CardError } from '../common/error.js';
import { parseArray, parseBoolean } from '../common/ops.js';
import { isLocaleAvailable } from '../translations.js';

/**
 * @file The api layer is the trust boundary:
 * a query string arrives as strings, and each endpoint declares what it accepts as a schema over them.
 * Parsing happens here once;
 * the render functions are handed typed values and keep their own defaults.
 *
 * `zod/mini` rather than `zod`:
 * this package ships to the browser, and the functional API tree-shakes down to the checks used below.
 */

/** Every param arrives as a string, or not at all. */
const rawParam = z.optional(z.string());

/** Characters a repository, owner or gist id may contain. */
const SAFE_PATTERN = /^[-\w/.,]+$/;

/** What a check rejected a param for. */
type Rejection = 'number' | 'year' | 'unsafe' | 'username' | 'locale' | 'enum' | 'color';

/**
 * Every rejection the api can put on an error card, in one place.
 * The param comes from the issue's own path, so no schema repeats its own name.
 */
const REJECTION_MESSAGES: Record<Rejection, (param: string) => string> = {
  number: (param) => `Invalid number input for parameter "${param}"`,
  year: (param) => `Invalid number input for parameter "${param}"`,
  unsafe: (param) => `Parameter "${param}" contains unsafe characters`,
  username: (param) => `Invalid username input for parameter "${param}"`,
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
 * `?x=true` / `?x=false`.
 * Anything else is `undefined`, which leaves the card's own default in place.
 */
const booleanParam = z.pipe(
  rawParam,
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
 * A number the card already falls back from — widths, counts, line heights:
 * `NaN` reaches the renderer, which answers it with its own default.
 */
const looseIntParam = z.pipe(
  rawParam,
  z.transform((value) => (value === undefined ? undefined : Number.parseInt(value, 10))),
);

/**
 * A four-digit year.
 * Anything else builds a `DateTime` GitHub rejects, so it is a permanent error here rather than a failed request later.
 * Yields the year, or `undefined` when the param is absent.
 */
const yearParam: z.ZodMiniType<number | undefined, string | undefined> = z.pipe(
  rawParam.check(rejects('year', (value) => /^\d{4}$/.test(value))),
  z.transform((value) => (value === undefined ? undefined : Number(value))),
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

/**
 * A comma-separated list of ids, checked before it is split.
 * The safe pattern allows the commas, so one check covers the whole list.
 * Yields the split values, empty when the param is absent.
 */
const safeListParam: z.ZodMiniType<Array<string>, string | undefined> = z.pipe(
  safeParam,
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
 * A param the card only renders as one of a fixed set of values.
 *
 * @returns Schema yielding one of `values`, or `undefined` when absent.
 */
const enumParam = <const T extends ReadonlyArray<string>>(
  values: T,
): z.ZodMiniType<T[number] | undefined, string | undefined> =>
  rawParam.check(rejects('enum', (value) => (values as ReadonlyArray<string>).includes(value)));

/**
 * Every color param an endpoint accepts, validated and picked in one pass.
 *
 * Theme params are `rawParam`:
 * they name a theme, and an unknown name falls back to the default rather than being an error.
 */
const colorParamsSchema = z.object(
  Object.fromEntries(
    COLOR_PARAM_KEYS.map((key) => [
      key,
      THEME_PARAM_KEYS.includes(key)
        ? rawParam
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
  enumParam,
  listParam,
  localeParam,
  looseIntParam,
  numberParam,
  parseColorParams,
  parseParams,
  rawParam,
  safeListParam,
  safeParam,
  usernameParam,
  yearParam,
};
