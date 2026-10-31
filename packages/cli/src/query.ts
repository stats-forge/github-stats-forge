/**
 * @file Answers in, query params out.
 *
 * The core handlers take exactly what a query string carries — strings — so an
 * answer becomes one here, and an unanswered option is simply absent.
 *
 * The same params go back out as a query string, which is the form every other
 * way of drawing a card takes: the action's `options` input, a hosted image URL,
 * the anvil's query box.
 */

import type { CardOption } from '@stats-forge/github-stats-forge-catalog';
import { queryOf } from '@stats-forge/github-stats-forge-core/api';

/** What a prompt answered, before it becomes a query param. */
export type Answer = string | number | boolean | Array<string> | undefined;

/**
 * @returns The query string form, or `undefined` when there is nothing to send.
 */
export const toParam = (value: Answer): string | undefined => {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(',') : undefined;
  }
  return String(value);
};

/**
 * @returns The query the card handler is called with.
 */
export const toQuery = (answers: ReadonlyMap<string, Answer>): Record<string, string> => {
  const query: Record<string, string> = {};
  for (const [name, value] of answers) {
    const param = toParam(value);
    if (param !== undefined) {
      query[name] = param;
    }
  }
  return query;
};

/** What the menu shows for an option nothing has answered. */
export const UNSET = '—';

/**
 * How an answer reads back in the option menu.
 *
 * @returns The value as the menu shows it, or {@link UNSET}.
 */
export const describeAnswer = (option: CardOption, value: Answer): string => {
  const param = toParam(value);
  if (param === undefined) {
    return UNSET;
  }
  if (option.kind !== 'boolean') {
    return param;
  }
  return value === true ? 'yes' : 'no';
};

/**
 * The params as a query string, ready to paste wherever a card is asked for by URL.
 * Carries the leading `?`, since that is how the action's `options` input and a
 * hosted image URL are both written.
 *
 * @returns The query string, or `?` when nothing is set.
 */
export const toQueryString = (query: Record<string, string>): string =>
  `?${new URLSearchParams(query).toString()}`;

/**
 * Reads back what {@link toQueryString} wrote, or anything else shaped like it:
 * a bare query string, one with its `?`, or a whole card URL to take the query off.
 *
 * A repeated key joins on commas, which is how every list param already reaches a card.
 *
 * @returns The params it carries, empty when it carries none.
 */
export const fromQueryString = (value: string): Record<string, string> => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return {};
  }

  // A pasted card URL is a query string with an address in front of it.
  const start = /^https?:\/\//i.test(trimmed) ? trimmed.indexOf('?') + 1 : 0;
  const params = new URLSearchParams(trimmed.slice(start));

  return queryOf(params);
};
