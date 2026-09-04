import type { CardKind, CardOption } from './cards.ts';

/**
 * @file Answers in, query params out.
 *
 * The core handlers take exactly what a query string carries — strings — so an
 * answer becomes one here, and an unanswered option is simply absent.
 */

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

/**
 * How an answer reads back in the option menu.
 *
 * @returns The value as the menu shows it.
 */
export const describeAnswer = (option: CardOption, value: Answer): string => {
  const param = toParam(value);
  if (param === undefined) {
    return '—';
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
