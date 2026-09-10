/**
 * @file What is served where: one path per card, named after the card, with no aliases.
 *
 * Spelled out rather than read off the CLI's catalog, which carries prompt prose and
 * `@inquirer/prompts` with the same seven ids; `tests/routes.test.ts` keeps the two in step.
 */

import {
  contributedTo,
  gist,
  org,
  pin,
  stats,
  topLangs,
  wakatime,
} from '@stats-forge/github-stats-forge-core/api';
import type { ApiResult, CardConfig } from '@stats-forge/github-stats-forge-core/api';

/** What core's api layer answers with: a query in, a drawn card or a drawn error out. */
type CardHandler = (query: Record<string, string>, config: CardConfig) => Promise<ApiResult>;

/** Every card, keyed by the path it is served at. */
const CARD_ROUTES: ReadonlyMap<string, CardHandler> = new Map([
  ['/api/stats', stats],
  ['/api/top-langs', topLangs],
  ['/api/pin', pin],
  ['/api/org', org],
  ['/api/contributed-to', contributedTo],
  ['/api/gist', gist],
  ['/api/wakatime', wakatime],
]);

/**
 * A path with its trailing slash removed, so `/api/stats/` and `/api/stats` are one route.
 * `/` keeps its slash, being the whole path rather than a trailing one.
 *
 * @returns The path a route is looked up by.
 */
const normalizePath = (pathname: string): string =>
  pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

/**
 * Which card a path draws, for the log line.
 *
 * @returns The card's id, or `undefined` when the path is not a card's.
 */
const cardIdFor = (path: string): string | undefined =>
  CARD_ROUTES.has(path) ? path.slice('/api/'.length) : undefined;

export type { CardHandler };

export { CARD_ROUTES, cardIdFor, normalizePath };
