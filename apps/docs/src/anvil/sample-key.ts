/**
 * @file How a request is keyed against a recorded response.
 *
 * Read by the recorder and by the transport, so the two cannot disagree. A key keeps only what a
 * request asks and drops who it asks for: a card's variables move with its options, so an
 * exact-match key would miss most of the option space.
 */

/** The one call that is neither GraphQL nor a REST search: wakatime's own endpoint. */
const WAKATIME_KEY = 'wakatime';

/** Scoped to whatever was chosen, so they cannot be part of a key. */
const SCOPE_QUALIFIERS = new Set(['repo', 'owner']);

/** `type:pr` and `type:issue` are different figures; `author:someone` is the same one either way. */
const VALUED_QUALIFIERS = new Set(['type']);

/** As `aliasedRanges` writes it. The selection has no nested braces, so it needs no balancing. */
const RANGE_FIELD = /range_\d+:\s*contributionsCollection\([^)]*\)\s*\{[^{}]*\}/g;

/** A run of collapsed range fields, which stands in for however many there were. */
const RANGE_RUN = /(?:RANGE\s*)+/g;

/** How many ranges a request asks for, which is one more than the highest alias it names. */
const rangeCount = (query: string): number => {
  let highest = -1;
  for (const match of query.matchAll(/range_(?<index>\d+):/g)) {
    highest = Math.max(highest, Number(match.groups?.['index']));
  }
  return highest + 1;
};

/** Kept under 2^31 so every intermediate product stays an exact integer. */
const HASH_MODULUS = 2_147_483_647;

/** @returns The query's shape, base 36 — short enough to read back in `samples.json`. */
const shapeHash = (text: string): string => {
  let hash = 0;
  for (const character of text) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % HASH_MODULUS;
  }
  return hash.toString(36);
};

/** The `query` field of a GraphQL request body. */
const queryText = (body: string | undefined): string | undefined => {
  if (body === undefined) {
    return undefined;
  }

  let parsed: { query?: unknown };
  try {
    parsed = JSON.parse(body) as { query?: unknown };
  } catch {
    return undefined;
  }

  const { query } = parsed;
  return typeof query === 'string' ? query : undefined;
};

/** @returns The operation name, or `undefined` when the body is not a named operation. */
const operationName = (body: string | undefined): string | undefined =>
  /\bquery\s+(?<name>\w+)/.exec(queryText(body) ?? '')?.groups?.['name'];

/**
 * The name alone is too coarse for the documents built at runtime: `userReposContributedTo` is one
 * name over two selections, and two cards each send one.
 *
 * @returns The key, or `undefined` when the body is not a named operation.
 */
const graphqlKey = (body: string | undefined): string | undefined => {
  const query = queryText(body);
  const name = operationName(body);
  if (query === undefined || name === undefined) {
    return undefined;
  }

  // The whole run becomes one marker, so any number of years keys alike.
  const collapsed = query.replaceAll(RANGE_FIELD, 'RANGE').replaceAll(RANGE_RUN, 'RANGE');
  return collapsed === query ? name : `${name}#${shapeHash(collapsed)}`;
};

/**
 * `q=repo:a/b owner:c commenter:me+-author:me+type:pr` keys as
 * `search/issues|-author,commenter,type:pr`: one key per figure, whatever it is scoped to.
 *
 * @returns The key for that search.
 */
const searchKey = (url: URL): string => {
  const qualifiers = (url.searchParams.get('q') ?? '')
    .split(/[\s+]+/)
    .filter((token) => token !== '')
    .map((token) => {
      const separator = token.indexOf(':');
      if (separator === -1) {
        return token;
      }
      const name = token.slice(0, separator);
      return VALUED_QUALIFIERS.has(name.replace(/^-/, '')) ? token : name;
    })
    .filter((name) => !SCOPE_QUALIFIERS.has(name.replace(/^-/, '')))
    .toSorted();

  return `${url.pathname.replace(/^\//, '')}|${qualifiers.join(',')}`;
};

/** @returns The key it is recorded under, or `undefined` for a request no branch recognises. */
const sampleKey = (url: string, init?: RequestInit): string | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if (parsed.pathname.startsWith('/api/v1/users/')) {
    return WAKATIME_KEY;
  }

  if (parsed.pathname.startsWith('/search/')) {
    return searchKey(parsed);
  }

  return graphqlKey(typeof init?.body === 'string' ? init.body : undefined);
};

export { rangeCount, sampleKey };
