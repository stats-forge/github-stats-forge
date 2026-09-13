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

import type { CardKind, CardOption } from './cards.ts';

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
  return option.kind === 'boolean' ? (value === true ? 'yes' : 'no') : param;
};

/**
 * The `.svg` file a card is written to when `--out` is not given.
 * Named after the card and whoever it is about, so a directory of them stays readable.
 *
 * @returns A file name, ending in `.svg`.
 */
export const defaultFileName = (card: CardKind, query: Record<string, string>): string => {
  const subject = query['username'] ?? query['id'] ?? 'card';
  const { repo } = query;
  const parts = [card.id, subject, repo].filter(Boolean).join('-');
  return `${parts.replaceAll(/[^\w.-]/g, '-')}.svg`;
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

  return Object.fromEntries(
    [...new Set(params.keys())].map((key) => [key, params.getAll(key).join(',')]),
  );
};
